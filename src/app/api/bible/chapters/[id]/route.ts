/**
 * GET /api/bible/chapters/[chapterId]
 * Retrieve all verses in a Bible chapter.
 *
 * Examples:
 *   /api/bible/chapters/JHN.3    → John chapter 3
 *   /api/bible/chapters/GEN.1    → Genesis chapter 1
 *
 * Query params:
 *   translationId (optional) — defaults to KJV (1)
 */

import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { getChapter } from "@/services/bible.service";

export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await getRequestUser(req);
    const { id: rawId } = await params;
    const translationId =
      req.nextUrl.searchParams.get("translationId") ?? undefined;
    const chapter = await getChapter(decodeURIComponent(rawId), translationId);
    return successResponse(chapter);
  },
);
