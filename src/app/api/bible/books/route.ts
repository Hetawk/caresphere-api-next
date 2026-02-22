/**
 * GET /api/bible/books
 * List all books for a Bible translation. Cached for 30 days.
 *
 * Query params:
 *   translationId (optional) — YouVersion version ID. Defaults to KJV (1).
 */

import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { getBooks } from "@/services/bible.service";

export const GET = withErrorHandling(async (req: NextRequest) => {
  await getRequestUser(req);
  const translationId =
    req.nextUrl.searchParams.get("translationId") ?? undefined;
  const books = await getBooks(translationId);
  return successResponse(books);
});
