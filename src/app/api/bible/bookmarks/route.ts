/**
 * GET  /api/bible/bookmarks  — List the authenticated user's Bible bookmarks.
 * POST /api/bible/bookmarks  — Add a new bookmark (upserts on duplicate reference+translation).
 *
 * GET query params:
 *   collection (optional) — filter by named collection
 *
 * POST body:
 *   reference     string  — USFM reference (e.g. "JHN.3.16")
 *   translationId string  — YouVersion version ID
 *   verseText     string  — The verse text to save locally
 *   collection    string? — Named collection (e.g. "favourites", "study")
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { ValidationError } from "@/lib/errors";
import { getBookmarks, createBookmark } from "@/services/bible.service";

const createSchema = z.object({
  reference: z.string().min(1),
  translationId: z.string().min(1),
  verseText: z.string().min(1),
  collection: z.string().optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const collection = req.nextUrl.searchParams.get("collection") ?? undefined;
  const bookmarks = await getBookmarks(currentUser.id, collection);
  return successResponse(bookmarks);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Invalid data",
    );

  const bookmark = await createBookmark(currentUser.id, parsed.data);
  return successResponse(bookmark);
});
