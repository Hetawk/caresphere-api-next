/**
 * Bible Service — YouVersion Platform API integration with PostgreSQL caching.
 *
 * Architecture:
 *  1. Check BibleCache (PostgreSQL) first — avoids YouVersion rate limits &
 *     enables offline-tolerant responses.
 *  2. On cache miss or expiry, call YouVersion REST API, validate, store, return.
 *  3. All DB personal features (bookmarks, notes, highlights, VOTD) are always
 *     served from Postgres (no external API call needed).
 *
 * YouVersion Platform API:
 *  Docs: https://platform.youversion.com/platform/apps
 *  Base: config.YOUVERSION_API_URL  (default: https://api.youversion.com/v1)
 *  Auth: Authorization: Bearer <YOUVERSION_API_KEY>
 *
 * Version ID reference (YouVersion internal IDs):
 *   1   = KJV
 *  59   = ESV
 * 111   = NIV
 * 116   = NLT
 * 206   = NKJV
 *
 * Reference formats accepted:
 *   "GEN.1.1"         → Genesis 1:1
 *   "JHN.3.16"        → John 3:16
 *   "JHN.3.16-18"     → John 3:16-18 (passage)
 *   Dot-separated USFM notation is what YouVersion uses internally.
 */

import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";
import { NotFoundError, ValidationError } from "@/lib/errors";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface YouVersionVerse {
  id: string;
  reference: string;
  content: string;
  version_id: number;
  version_abbreviation: string;
  copyright?: string;
}

export interface YouVersionChapter {
  id: string; // e.g. "GEN.1"
  book_id: string;
  book_long_name: string;
  chapter_number: number;
  verses: YouVersionVerse[];
  version_id: number;
}

export interface YouVersionBook {
  id: string; // e.g. "GEN"
  abbreviation: string;
  long_name: string;
  canon?: string; // "ot" | "nt" | "deut"
  chapters?: { id: string; chapter: number }[];
}

export interface YouVersionVersion {
  id: number;
  title: string;
  abbreviation: string;
  local_abbreviation?: string;
  local_title?: string;
  language?: string;
  language_tag?: string;
}

export interface YouVersionVotd {
  day?: string; // ISO date
  reference: string;
  verse: YouVersionVerse;
  image?: { url: string; attribution: string };
}

export interface YouVersionSearchResult {
  total: number;
  verseItems: YouVersionVerse[];
}

export interface BibleBookmarkPayload {
  reference: string;
  translationId: string;
  verseText: string;
  collection?: string;
}

export interface BibleNotePayload {
  reference: string;
  translationId: string;
  noteText: string;
  isPrivate?: boolean;
}

export interface BibleHighlightPayload {
  reference: string;
  translationId: string;
  color?: string;
  organizationId?: string;
}

export interface SetVotdPayload {
  reference: string;
  translationId?: string;
  verseText?: string;
  scheduledDate?: Date;
  isAutomatic?: boolean;
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

const PROVIDER = "youversion";

/**
 * Wraps any YouVersion API call with a transparent Postgres cache layer.
 * - Returns cached JSON if it exists and has not expired.
 * - On cache miss, calls `fetcher()`, stores result with TTL, returns it.
 * - Increments `hitCount` on cache hits so stale items can be monitored.
 */
async function cachedFetch<T>(
  cacheKey: string,
  resourceType: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = new Date();

  // Check DB cache
  const cached = await prisma.bibleCache.findUnique({ where: { cacheKey } });
  if (cached && cached.expiresAt > now) {
    // Cache hit — bump counter async (don't block)
    prisma.bibleCache
      .update({
        where: { cacheKey },
        data: { hitCount: { increment: 1 } },
      })
      .catch(() => null);
    return cached.payload as unknown as T;
  }

  // Cache miss — fetch from YouVersion
  const result = await fetcher();

  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  await prisma.bibleCache.upsert({
    where: { cacheKey },
    create: {
      cacheKey,
      provider: PROVIDER,
      resourceType,
      payload: result as object,
      expiresAt,
      hitCount: 0,
    },
    update: {
      payload: result as object,
      expiresAt,
      updatedAt: now,
      hitCount: 0,
    },
  });

  return result;
}

// ─── YouVersion HTTP client ───────────────────────────────────────────────────

function apiKey(): string {
  const key = config.YOUVERSION_API_KEY;
  if (!key) {
    throw new ValidationError(
      "YOUVERSION_API_KEY is not configured. " +
        "Register at https://platform.youversion.com/platform/apps",
    );
  }
  return key;
}

async function yvFetch<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const baseUrl = config.YOUVERSION_API_URL.replace(/\/$/, "");
  const url = new URL(`${baseUrl}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    // Next.js — disable aggressive caching at the fetch layer; we handle cache in DB
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    if (res.status === 404) throw new NotFoundError("Bible resource");
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`YouVersion API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ─── Default translation helper ───────────────────────────────────────────────

function defaultTranslation(): string {
  return config.BIBLE_DEFAULT_TRANSLATION || "1"; // 1 = KJV
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * List all available Bible translations/versions.
 * Cached for 30 days (translations rarely change).
 */
export async function getTranslations(
  languageTag?: string,
): Promise<YouVersionVersion[]> {
  const cacheKey = `translations:${languageTag ?? "all"}`;
  return cachedFetch(
    cacheKey,
    "translations",
    config.BIBLE_CACHE_TTL_TRANSLATIONS,
    async () => {
      const params: Record<string, string> = {};
      if (languageTag) params["language_tag"] = languageTag;
      const data = await yvFetch<{
        versions?: YouVersionVersion[];
        data?: YouVersionVersion[];
      }>("/bible/versions", params);
      return (
        data.versions ?? data.data ?? (data as unknown as YouVersionVersion[])
      );
    },
  );
}

/**
 * List books for a given translation.
 * Cached for 30 days.
 */
export async function getBooks(
  translationId?: string,
): Promise<YouVersionBook[]> {
  const vid = translationId ?? defaultTranslation();
  const cacheKey = `books:${vid}`;
  return cachedFetch(
    cacheKey,
    "books",
    config.BIBLE_CACHE_TTL_TRANSLATIONS,
    async () => {
      const data = await yvFetch<{
        books?: YouVersionBook[];
        data?: YouVersionBook[];
      }>("/bible/books", { version_id: vid });
      return data.books ?? data.data ?? (data as unknown as YouVersionBook[]);
    },
  );
}

/**
 * Get a single verse by USFM reference (e.g. "JHN.3.16").
 * Cached for 7 days.
 */
export async function getVerse(
  reference: string,
  translationId?: string,
): Promise<YouVersionVerse> {
  const vid = translationId ?? defaultTranslation();
  const cacheKey = `verse:${vid}:${reference}`;
  return cachedFetch(
    cacheKey,
    "verse",
    config.BIBLE_CACHE_TTL_VERSE,
    async () => {
      const data = await yvFetch<{
        verse?: YouVersionVerse;
        data?: YouVersionVerse;
      }>("/bible/verse", { id: reference, version_id: vid });
      return data.verse ?? data.data ?? (data as unknown as YouVersionVerse);
    },
  );
}

/**
 * Get a passage (range of verses), e.g. "JHN.3.16-18".
 * Cached for 7 days.
 */
export async function getPassage(
  reference: string,
  translationId?: string,
): Promise<YouVersionVerse[]> {
  const vid = translationId ?? defaultTranslation();
  const cacheKey = `passage:${vid}:${reference}`;
  return cachedFetch(
    cacheKey,
    "passage",
    config.BIBLE_CACHE_TTL_VERSE,
    async () => {
      const data = await yvFetch<{
        verses?: YouVersionVerse[];
        data?: YouVersionVerse[];
      }>("/bible/verses", { reference, version_id: vid });
      return data.verses ?? data.data ?? (data as unknown as YouVersionVerse[]);
    },
  );
}

/**
 * Get all verses in a chapter, e.g. chapterId = "JHN.3".
 * Cached for 7 days.
 */
export async function getChapter(
  chapterId: string,
  translationId?: string,
): Promise<YouVersionChapter> {
  const vid = translationId ?? defaultTranslation();
  const cacheKey = `chapter:${vid}:${chapterId}`;
  return cachedFetch(
    cacheKey,
    "chapter",
    config.BIBLE_CACHE_TTL_VERSE,
    async () => {
      const [bookId, chapterNum] = chapterId.split(".");
      const data = await yvFetch<{
        chapter?: YouVersionChapter;
        data?: YouVersionChapter;
      }>("/bible/chapter", {
        book_id: bookId,
        chapter: chapterNum ?? "1",
        version_id: vid,
      });
      return (
        data.chapter ?? data.data ?? (data as unknown as YouVersionChapter)
      );
    },
  );
}

/**
 * Full-text search across the Bible.
 * Cached for 1 day per (query, translation) pair.
 */
export async function search(
  query: string,
  translationId?: string,
  limit = 10,
  offset = 0,
): Promise<YouVersionSearchResult> {
  const vid = translationId ?? defaultTranslation();
  const cacheKey = `search:${vid}:${query.toLowerCase().trim()}:${limit}:${offset}`;
  return cachedFetch(
    cacheKey,
    "search",
    config.BIBLE_CACHE_TTL_SEARCH,
    async () => {
      const data = await yvFetch<{
        total?: number;
        verseItems?: YouVersionVerse[];
        verses?: YouVersionVerse[];
        data?: YouVersionVerse[];
      }>("/bible/search", {
        query,
        version_id: vid,
        limit: String(limit),
        offset: String(offset),
      });
      return {
        total: data.total ?? 0,
        verseItems: data.verseItems ?? data.verses ?? data.data ?? [],
      };
    },
  );
}

// ─── Verse of the Day ─────────────────────────────────────────────────────────

/**
 * Get (or auto-create) the Verse of the Day for an organization.
 *
 * Logic:
 *  1. Look for a manually set VOTD for today in the DB.
 *  2. If not found, pull YouVersion's global VOTD, store it for the org, return it.
 */
export async function getVerseOfDay(
  organizationId: string,
  date?: Date,
): Promise<{
  reference: string;
  verseText: string;
  translationId: string;
  isAutomatic: boolean;
  scheduledDate: Date;
}> {
  const today = date ?? new Date();
  // Strip to date only
  const scheduledDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  // Check for existing org VOTD entry
  const existing = await prisma.bibleVerseOfDay.findUnique({
    where: {
      uq_votd_org_date: { organizationId, scheduledDate },
    },
  });

  if (existing) {
    return {
      reference: existing.reference,
      verseText: existing.verseText,
      translationId: existing.translationId,
      isAutomatic: existing.isAutomatic,
      scheduledDate: existing.scheduledDate,
    };
  }

  // Fetch YouVersion global VOTD
  const cacheKey = `votd:global:${scheduledDate.toISOString().slice(0, 10)}`;
  const votd = await cachedFetch<YouVersionVotd>(
    cacheKey,
    "votd",
    86400, // cache global VOTD for 24h
    async () => {
      const vid = defaultTranslation();
      const data = await yvFetch<{
        day?: YouVersionVotd;
        data?: YouVersionVotd;
        verse?: YouVersionVerse;
      }>("/bible/verse_of_the_day", { version_id: vid });
      // Normalize response shape
      if (data.day) return data.day;
      if (data.data) return data.data;
      // Some YouVersion endpoints return the verse directly
      const verse = data as unknown as YouVersionVotd;
      return verse;
    },
  );

  // Store auto VOTD for this org
  const reference = votd.reference ?? votd.verse?.reference ?? "";
  const verseText = votd.verse?.content ?? "";
  const translationId = String(votd.verse?.version_id ?? defaultTranslation());

  const created = await prisma.bibleVerseOfDay.create({
    data: {
      organizationId,
      reference,
      translationId,
      verseText,
      provider: PROVIDER,
      scheduledDate,
      isAutomatic: true,
    },
  });

  return {
    reference: created.reference,
    verseText: created.verseText,
    translationId: created.translationId,
    isAutomatic: created.isAutomatic,
    scheduledDate: created.scheduledDate,
  };
}

/**
 * Admin: manually set (or override) the VOTD for an org on a given date.
 */
export async function setVerseOfDay(
  organizationId: string,
  payload: SetVotdPayload,
  setById: string,
): Promise<{ reference: string; verseText: string; scheduledDate: Date }> {
  const { reference, translationId, verseText, scheduledDate, isAutomatic } =
    payload;
  const vid = translationId ?? defaultTranslation();

  // If verseText not supplied, fetch it
  let text = verseText;
  if (!text) {
    try {
      const verse = await getVerse(reference, vid);
      text = verse.content ?? "";
    } catch {
      text = "";
    }
  }

  const date =
    scheduledDate ??
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate(),
    );

  const record = await prisma.bibleVerseOfDay.upsert({
    where: {
      uq_votd_org_date: { organizationId, scheduledDate: date },
    },
    create: {
      organizationId,
      reference,
      translationId: vid,
      verseText: text,
      provider: PROVIDER,
      scheduledDate: date,
      isAutomatic: isAutomatic ?? false,
      setBy: setById,
    },
    update: {
      reference,
      translationId: vid,
      verseText: text,
      isAutomatic: isAutomatic ?? false,
      setBy: setById,
      updatedAt: new Date(),
    },
  });

  return {
    reference: record.reference,
    verseText: record.verseText,
    scheduledDate: record.scheduledDate,
  };
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export async function getBookmarks(userId: string, collection?: string) {
  return prisma.bibleBookmark.findMany({
    where: { userId, ...(collection ? { collection } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

export async function createBookmark(
  userId: string,
  payload: BibleBookmarkPayload,
) {
  const { reference, translationId, verseText, collection } = payload;
  return prisma.bibleBookmark.upsert({
    where: {
      uq_bookmark_user_ref_trans: { userId, reference, translationId },
    },
    create: { userId, reference, translationId, verseText, collection },
    update: { verseText, collection, updatedAt: new Date() },
  });
}

export async function deleteBookmark(userId: string, bookmarkId: string) {
  const bookmark = await prisma.bibleBookmark.findFirst({
    where: { id: bookmarkId, userId },
  });
  if (!bookmark) throw new NotFoundError("Bookmark");
  await prisma.bibleBookmark.delete({ where: { id: bookmarkId } });
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function getNotes(userId: string, reference?: string) {
  return prisma.bibleNote.findMany({
    where: { userId, ...(reference ? { reference } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

export async function createNote(userId: string, payload: BibleNotePayload) {
  const { reference, translationId, noteText, isPrivate = true } = payload;
  return prisma.bibleNote.create({
    data: { userId, reference, translationId, noteText, isPrivate },
  });
}

export async function updateNote(
  userId: string,
  noteId: string,
  updates: Partial<Pick<BibleNotePayload, "noteText" | "isPrivate">>,
) {
  const note = await prisma.bibleNote.findFirst({
    where: { id: noteId, userId },
  });
  if (!note) throw new NotFoundError("Note");
  return prisma.bibleNote.update({
    where: { id: noteId },
    data: { ...updates, updatedAt: new Date() },
  });
}

export async function deleteNote(userId: string, noteId: string) {
  const note = await prisma.bibleNote.findFirst({
    where: { id: noteId, userId },
  });
  if (!note) throw new NotFoundError("Note");
  await prisma.bibleNote.delete({ where: { id: noteId } });
}

// ─── Highlights ───────────────────────────────────────────────────────────────

export async function getHighlights(userId: string, reference?: string) {
  return prisma.bibleHighlight.findMany({
    where: { userId, ...(reference ? { reference } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

export async function createHighlight(
  userId: string,
  payload: BibleHighlightPayload,
) {
  const {
    reference,
    translationId,
    color = "yellow",
    organizationId,
  } = payload;
  return prisma.bibleHighlight.upsert({
    where: {
      uq_highlight_user_ref_trans: { userId, reference, translationId },
    },
    create: { userId, reference, translationId, color, organizationId },
    update: { color, updatedAt: new Date() },
  });
}

export async function deleteHighlight(userId: string, highlightId: string) {
  const highlight = await prisma.bibleHighlight.findFirst({
    where: { id: highlightId, userId },
  });
  if (!highlight) throw new NotFoundError("Highlight");
  await prisma.bibleHighlight.delete({ where: { id: highlightId } });
}

// ─── Bible guard helpers ──────────────────────────────────────────────────────

/**
 * Check that an organization has Bible features enabled.
 * Throws ValidationError if not, so route handlers can use it directly.
 */
export async function requireBibleEnabled(
  organizationId: string,
): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { bibleEnabled: true, name: true },
  });
  if (!org) throw new NotFoundError("Organization");
  if (!org.bibleEnabled) {
    throw new ValidationError(
      `Bible features are not enabled for "${org.name}". ` +
        "Contact your administrator to enable them.",
    );
  }
}
