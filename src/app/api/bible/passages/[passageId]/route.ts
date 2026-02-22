/**
 * GET /api/bible/passages/[passageId]
 * Retrieve a passage (range of verses) by USFM range reference.
 *
 * Examples:
 *   /api/bible/passages/JHN.3.16-18
 *   /api/bible/passages/PSA.23.1-6
 *
 * Query params:
 *   translationId (optional) — defaults to KJV (1)
 */

import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { getPassage } from "@/services/bible.service";

export const GET = withErrorHandling(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ passageId: string }> },
  ) => {
    await getRequestUser(req);
    const { passageId } = await params;
    const translationId =
      req.nextUrl.searchParams.get("translationId") ?? undefined;
    const reference = decodeURIComponent(passageId);
    const verses = await getPassage(reference, translationId);
    return successResponse(verses);
  },
);
