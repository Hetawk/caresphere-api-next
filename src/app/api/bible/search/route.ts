/**
 * GET /api/bible/search
 * Full-text search across the Bible. Cached for 1 day per (query, translation).
 *
 * Query params:
 *   q             — search query (required)
 *   translationId — YouVersion version ID (optional, defaults to KJV)
 *   limit         — max results (default 10, max 50)
 *   offset        — pagination offset (default 0)
 */

import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { ValidationError } from "@/lib/errors";
import { search } from "@/services/bible.service";

export const GET = withErrorHandling(async (req: NextRequest) => {
  await getRequestUser(req);

  const sp = req.nextUrl.searchParams;
  const query = sp.get("q");
  if (!query?.trim()) throw new ValidationError("Search query 'q' is required");

  const translationId = sp.get("translationId") ?? undefined;
  const limit = Math.min(parseInt(sp.get("limit") ?? "10", 10), 50);
  const offset = parseInt(sp.get("offset") ?? "0", 10);

  const results = await search(query.trim(), translationId, limit, offset);
  return successResponse(results);
});
