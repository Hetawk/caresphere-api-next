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
 *  Docs: https://developers.youversion.com/overview
 *  Base: config.YOUVERSION_API_URL  (default: https://api.youversion.com/v1)
 *  Auth: X-YVP-App-Key: <YOUVERSION_API_KEY>
 *
 * Note:
 *  Bible/version availability depends on your app key permissions.
 *  Example from current project key: 3034 (BSB) is accessible, 1 (KJV) is not.
 *  The default translation is configured via BIBLE_DEFAULT_TRANSLATION (defaults to 3034/BSB).
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
  version_id?: number;
  version_abbreviation?: string;
  copyright?: string;
}

export interface YouVersionChapter {
  id: string; // e.g. "GEN.1"
  book_id?: string;
  book_long_name?: string;
  chapter_number?: number;
  verses: YouVersionVerse[];
  version_id?: number;
}

export interface YouVersionBook {
  id: string; // e.g. "GEN"
  abbreviation?: string;
  long_name?: string;
  title?: string;
  full_title?: string;
  canon?: string; // "ot" | "nt" | "deut"
  chapters?: { id: string; chapter?: number; passage_id?: string }[];
}

export interface YouVersionVersion {
  id: number | string; // string for supplemental providers (e.g. "bibleapi:kjv", "esv")
  title: string;
  abbreviation?: string;
  local_abbreviation?: string;
  local_title?: string;
  language?: string;
  language_tag?: string;
  provider?: "youversion" | "bibleapi" | "esv";
}

export interface YouVersionVotd {
  day?: string | number;
  reference?: string;
  passage_id?: string;
  verse?: YouVersionVerse;
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
  params?: Record<string, string | string[]>,
): Promise<T> {
  const baseUrl = config.YOUVERSION_API_URL.replace(/\/$/, "");
  const url = new URL(`${baseUrl}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((item) => url.searchParams.append(k, item));
      } else {
        url.searchParams.set(k, v);
      }
    });
  }

  const res = await fetch(url.toString(), {
    headers: {
      "X-YVP-App-Key": apiKey(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    // Next.js — disable aggressive caching at the fetch layer; we handle cache in DB
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    if (res.status === 404) throw new NotFoundError("Bible resource");
    if (res.status === 403) {
      const body = await res.text().catch(() => "");
      throw new ValidationError(
        `YouVersion access denied for this resource/version. ${body}`,
      );
    }
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`YouVersion API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ─── Default translation helper ───────────────────────────────────────────────

function defaultTranslation(): string {
  return config.BIBLE_DEFAULT_TRANSLATION || "3034"; // 3034 = BSB (open-license, always accessible)
}

function fallbackTranslationId(requestedId: string): string | null {
  // If a caller explicitly requested KJV (1) but the app key doesn't permit it,
  // fall back silently to BSB (3034).
  if (requestedId === "1") return "3034";
  return null;
}

function toVerse(
  reference: string,
  content: string,
  versionId: string,
): YouVersionVerse {
  return {
    id: reference,
    reference,
    content,
    version_id: Number(versionId),
  };
}

// ─── Supplemental Bible providers ────────────────────────────────────────────
//
// YouVersion is the PRIMARY and preferred Bible provider for all translations.
// Every verse/passage lookup hits YouVersion first.
//
// However, YouVersion only licenses translations to app keys with explicit
// publisher agreements.  Public-domain and open-access versions that our current
// app key cannot reach are served by lightweight fallback providers so users
// still see them in the dropdown:
//
//   • bible-api.com  — public-domain texts not in our YV key (KJV, YLT)
//                      Used ONLY when the translation id starts with "bibleapi:"
//   • ESV API        — Crossway free tier (requires ESV_API_KEY env var)
//                      Used ONLY when translation id === "esv"
//
// Everything else goes through YouVersion exclusively.
//
// NIV and NKJV are NOT freely available through any public API — they require
// direct commercial licensing from Biblica / Thomas Nelson respectively.

/** Maps USFM book codes → human names accepted by bible-api.com and ESV API. */
const USFM_BOOK_NAMES: Record<string, string> = {
  GEN: "genesis",
  EXO: "exodus",
  LEV: "leviticus",
  NUM: "numbers",
  DEU: "deuteronomy",
  JOS: "joshua",
  JDG: "judges",
  RUT: "ruth",
  "1SA": "1 samuel",
  "2SA": "2 samuel",
  "1KI": "1 kings",
  "2KI": "2 kings",
  "1CH": "1 chronicles",
  "2CH": "2 chronicles",
  EZR: "ezra",
  NEH: "nehemiah",
  EST: "esther",
  JOB: "job",
  PSA: "psalms",
  PRO: "proverbs",
  ECC: "ecclesiastes",
  SNG: "song of solomon",
  ISA: "isaiah",
  JER: "jeremiah",
  LAM: "lamentations",
  EZK: "ezekiel",
  DAN: "daniel",
  HOS: "hosea",
  JOL: "joel",
  AMO: "amos",
  OBA: "obadiah",
  JON: "jonah",
  MIC: "micah",
  NAM: "nahum",
  HAB: "habakkuk",
  ZEP: "zephaniah",
  HAG: "haggai",
  ZEC: "zechariah",
  MAL: "malachi",
  MAT: "matthew",
  MRK: "mark",
  LUK: "luke",
  JHN: "john",
  ACT: "acts",
  ROM: "romans",
  "1CO": "1 corinthians",
  "2CO": "2 corinthians",
  GAL: "galatians",
  EPH: "ephesians",
  PHP: "philippians",
  COL: "colossians",
  "1TH": "1 thessalonians",
  "2TH": "2 thessalonians",
  "1TI": "1 timothy",
  "2TI": "2 timothy",
  TIT: "titus",
  PHM: "philemon",
  HEB: "hebrews",
  JAS: "james",
  "1PE": "1 peter",
  "2PE": "2 peter",
  "1JN": "1 john",
  "2JN": "2 john",
  "3JN": "3 john",
  JUD: "jude",
  REV: "revelation",
};

/**
 * Convert a USFM reference to a human-readable form accepted by bible-api.com
 * and the ESV API.
 *   "JHN.3.16"    → "john 3:16"
 *   "JHN.3.16-18" → "john 3:16-18"
 *   "PSA.23"      → "psalms 23"
 */
function usfmToHumanRef(usfm: string): string {
  const parts = usfm.split(".");
  const bookName =
    USFM_BOOK_NAMES[parts[0].toUpperCase()] ?? parts[0].toLowerCase();
  if (parts.length === 1) return bookName;
  if (parts.length === 2) return `${bookName} ${parts[1]}`;
  return `${bookName} ${parts[1]}:${parts[2]}`; // parts[2] may be "16" or "16-18"
}

interface BibleApiComResponse {
  reference: string;
  text: string;
  translation_id: string;
  translation_name: string;
  verses: Array<{
    book_id: string;
    book_name: string;
    chapter: number;
    verse: number;
    text: string;
  }>;
}

/** Fetch a passage from bible-api.com (public-domain, no auth required). */
async function fetchFromBibleApi(
  reference: string,
  translationCode: string,
): Promise<YouVersionVerse[]> {
  const humanRef = usfmToHumanRef(reference);
  const baseUrl = config.BIBLE_PUBLIC_DOMAIN_API_URL.replace(/\/$/, "");
  const url = `${baseUrl}/${encodeURIComponent(humanRef)}?translation=${encodeURIComponent(translationCode)}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    if (res.status === 404) throw new NotFoundError("Bible passage");
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`bible-api.com error ${res.status}: ${body}`);
  }

  const data: BibleApiComResponse = await res.json();
  // bible-api.com returns verse text with literal \n line breaks between verse
  // fragments.  Collapse them into a single space so the verse reads as a
  // continuous sentence in the message compose view.
  const rawText = (data.text ?? "").trim();
  const content = rawText.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ");
  return [
    {
      id: `${translationCode}:${reference}`,
      reference: data.reference ?? reference,
      content,
      version_abbreviation: translationCode.toUpperCase(),
    },
  ];
}

interface EsvApiResponse {
  canonical: string;
  passages: string[];
}

/** Fetch a passage from the Crossway ESV API (requires ESV_API_KEY env var). */
async function fetchFromEsvApi(reference: string): Promise<YouVersionVerse[]> {
  if (!config.ESV_API_KEY)
    throw new ValidationError("ESV_API_KEY is not configured");

  const humanRef = usfmToHumanRef(reference);
  const url = new URL(`${config.ESV_API_URL}/passage/text/`);
  url.searchParams.set("q", humanRef);
  url.searchParams.set("include-headings", "false");
  url.searchParams.set("include-footnotes", "false");
  url.searchParams.set("include-verse-numbers", "false");
  url.searchParams.set("include-short-copyright", "true");
  url.searchParams.set("include-passage-references", "false");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Token ${config.ESV_API_KEY}`,
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    if (res.status === 404) throw new NotFoundError("Bible passage (ESV)");
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`ESV API error ${res.status}: ${body}`);
  }

  const data: EsvApiResponse = await res.json();
  const text = (data.passages?.[0] ?? "").trim();
  return [
    {
      id: `esv:${reference}`,
      reference: data.canonical ?? reference,
      content: text,
      version_abbreviation: "ESV",
    },
  ];
}

/**
 * Supplemental translations served by non-YouVersion providers.
 * Merged into getTranslations() when the YouVersion app key does not include them.
 */
const SUPPLEMENTAL_TRANSLATIONS: YouVersionVersion[] = [
  {
    id: "bibleapi:kjv",
    title: "King James Version",
    abbreviation: "KJV",
    language: "English",
    language_tag: "en",
    provider: "bibleapi",
  },
  {
    id: "bibleapi:ylt",
    title: "Young's Literal Translation",
    abbreviation: "YLT",
    language: "English",
    language_tag: "en",
    provider: "bibleapi",
  },
];

/** ESV translation entry — only added when ESV_API_KEY is configured. */
const ESV_TRANSLATION: YouVersionVersion = {
  id: "esv",
  title: "English Standard Version",
  abbreviation: "ESV",
  language: "English",
  language_tag: "en",
  provider: "esv",
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * List all available Bible translations/versions.
 * Fetches every page from YouVersion so no version is missed.
 * Cached for 30 days (translations rarely change).
 *
 * Cache-key includes "v2" so any client that stored the old single-page
 * result will automatically get a fresh full-list on the next request.
 */
export async function getTranslations(
  languageTag?: string,
): Promise<YouVersionVersion[]> {
  const cacheKey = `translations:v2:${languageTag ?? "all"}`;
  const yvList = await cachedFetch(
    cacheKey,
    "translations",
    config.BIBLE_CACHE_TTL_TRANSLATIONS,
    async () => {
      const PAGE_SIZE = 100;
      const all: YouVersionVersion[] = [];
      let page = 1;

      while (true) {
        const params: Record<string, string | string[]> = {
          "language_ranges[]": languageTag ? [languageTag] : ["en"],
          page_size: String(PAGE_SIZE),
          page: String(page),
        };
        const data = await yvFetch<{ data?: YouVersionVersion[] }>(
          "/bibles",
          params,
        );
        const items = data.data ?? [];
        all.push(...items);
        if (items.length < PAGE_SIZE) break;
        page++;
      }

      return all;
    },
  );

  // Merge supplemental translations not already present in the YouVersion list.
  const existingAbbrevs = new Set(
    yvList
      .map((t) => (t.abbreviation ?? t.local_abbreviation ?? "").toUpperCase())
      .filter(Boolean),
  );
  const toAdd: YouVersionVersion[] = SUPPLEMENTAL_TRANSLATIONS.filter(
    (t) => !existingAbbrevs.has((t.abbreviation ?? "").toUpperCase()),
  );
  // Always surface ESV so it appears in the dropdown.
  // The actual lookup will fail gracefully if ESV_API_KEY is not set.
  if (!existingAbbrevs.has("ESV")) {
    toAdd.push(ESV_TRANSLATION);
  }

  // Return well-known translations (KJV, ESV) first so they appear at the top.
  return [...toAdd, ...yvList];
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
      const data = await yvFetch<{ data?: YouVersionBook[] }>(
        `/bibles/${vid}/books`,
      );
      return data.data ?? [];
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

  // ── Supplemental providers ──
  if (vid.startsWith("bibleapi:")) {
    return cachedFetch(
      cacheKey,
      "verse",
      config.BIBLE_CACHE_TTL_VERSE,
      async () => {
        const verses = await fetchFromBibleApi(
          reference,
          vid.slice("bibleapi:".length),
        );
        return verses[0] ?? { id: reference, reference, content: "" };
      },
    );
  }
  if (vid === "esv") {
    return cachedFetch(
      cacheKey,
      "verse",
      config.BIBLE_CACHE_TTL_VERSE,
      async () => {
        const verses = await fetchFromEsvApi(reference);
        return verses[0] ?? { id: reference, reference, content: "" };
      },
    );
  }

  // ── YouVersion ──
  return cachedFetch(
    cacheKey,
    "verse",
    config.BIBLE_CACHE_TTL_VERSE,
    async () => {
      try {
        const data = await yvFetch<{
          id?: string;
          reference?: string;
          content?: string;
        }>(`/bibles/${vid}/passages/${encodeURIComponent(reference)}`);
        return toVerse(data.reference ?? reference, data.content ?? "", vid);
      } catch (error) {
        const fallbackVid = fallbackTranslationId(vid);
        if (!fallbackVid || translationId) throw error;
        const fallbackData = await yvFetch<{
          id?: string;
          reference?: string;
          content?: string;
        }>(`/bibles/${fallbackVid}/passages/${encodeURIComponent(reference)}`);
        return toVerse(
          fallbackData.reference ?? reference,
          fallbackData.content ?? "",
          fallbackVid,
        );
      }
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

  // ── Supplemental providers ──
  if (vid.startsWith("bibleapi:")) {
    return cachedFetch(cacheKey, "passage", config.BIBLE_CACHE_TTL_VERSE, () =>
      fetchFromBibleApi(reference, vid.slice("bibleapi:".length)),
    );
  }
  if (vid === "esv") {
    return cachedFetch(cacheKey, "passage", config.BIBLE_CACHE_TTL_VERSE, () =>
      fetchFromEsvApi(reference),
    );
  }

  // ── YouVersion ──
  return cachedFetch(
    cacheKey,
    "passage",
    config.BIBLE_CACHE_TTL_VERSE,
    async () => {
      try {
        const data = await yvFetch<{
          id?: string;
          reference?: string;
          content?: string;
        }>(`/bibles/${vid}/passages/${encodeURIComponent(reference)}`);
        return [toVerse(data.reference ?? reference, data.content ?? "", vid)];
      } catch (error) {
        const fallbackVid = fallbackTranslationId(vid);
        if (!fallbackVid || translationId) throw error;
        const fallbackData = await yvFetch<{
          id?: string;
          reference?: string;
          content?: string;
        }>(`/bibles/${fallbackVid}/passages/${encodeURIComponent(reference)}`);
        return [
          toVerse(
            fallbackData.reference ?? reference,
            fallbackData.content ?? "",
            fallbackVid,
          ),
        ];
      }
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
      let targetVid = vid;
      let data: { id?: string; reference?: string; content?: string };
      try {
        data = await yvFetch<{
          id?: string;
          reference?: string;
          content?: string;
        }>(`/bibles/${targetVid}/passages/${encodeURIComponent(chapterId)}`);
      } catch (error) {
        const fallbackVid = fallbackTranslationId(targetVid);
        if (!fallbackVid || translationId) throw error;
        targetVid = fallbackVid;
        data = await yvFetch<{
          id?: string;
          reference?: string;
          content?: string;
        }>(`/bibles/${targetVid}/passages/${encodeURIComponent(chapterId)}`);
      }

      const [bookId, chapterNum] = chapterId.split(".");
      return {
        id: chapterId,
        book_id: bookId,
        chapter_number: Number(chapterNum ?? "1"),
        version_id: Number(targetVid),
        verses: [
          toVerse(data.reference ?? chapterId, data.content ?? "", targetVid),
        ],
      };
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
  void translationId;
  void limit;
  void offset;
  // Public YouVersion API for this app key does not expose a text-search endpoint.
  // Keep the method so routes remain stable, but fail with a clear message.
  throw new ValidationError(
    `YouVersion search endpoint is not available for this API key. Query: "${query}"`,
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

  // Try YouVersion global VOTD endpoint first.
  // Some app keys/plans don't expose it; fallback to a deterministic daily passage.
  const cacheKey = `votd:global:${scheduledDate.toISOString().slice(0, 10)}`;
  const votd = await cachedFetch<YouVersionVotd>(
    cacheKey,
    "votd",
    86400, // cache global VOTD for 24h
    async () => {
      const vid = defaultTranslation();
      const dayOfYear = Math.ceil(
        (scheduledDate.getTime() -
          new Date(scheduledDate.getFullYear(), 0, 0).getTime()) /
          86400000,
      );

      try {
        // Official endpoint returns { day, passage_id }.
        const dayData = await yvFetch<{ day: number; passage_id: string }>(
          `/verse_of_the_days/${dayOfYear}`,
        );
        const verse = await getVerse(dayData.passage_id, vid);
        return {
          day: dayData.day,
          passage_id: dayData.passage_id,
          reference: verse.reference,
          verse,
        };
      } catch {
        // noop - fall back below
      }

      const fallbackRefs = [
        "JHN.3.16",
        "PSA.23.1",
        "ROM.8.28",
        "PHP.4.13",
        "JER.29.11",
        "PRO.3.5-6",
        "ISA.41.10",
      ];
      const ref = fallbackRefs[dayOfYear % fallbackRefs.length] ?? "JHN.3.16";
      const verse = await getVerse(ref, vid);
      return {
        reference: verse.reference,
        verse,
      };
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
