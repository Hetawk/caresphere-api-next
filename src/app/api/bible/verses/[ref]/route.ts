/**
 * GET /api/bible/verses/[reference]
 * Retrieve a single Bible verse by USFM reference.
 *
 * USFM examples: JHN.3.16, GEN.1.1, PSA.23.1
 * (URL-encode dots as %2E if needed, or use hyphens — both accepted)
 *
 * Query params:
 *   translationId (optional) — defaults to KJV (1)
 */

import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { getVerse } from "@/services/bible.service";

export const GET = withErrorHandling(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ ref: string }> },
  ) => {
    await getRequestUser(req);
    const { ref: reference } = await params;
    const translationId =
      req.nextUrl.searchParams.get("translationId") ?? undefined;
    // Decode URL-encoded reference
    const decodedRef = decodeURIComponent(reference);
    const verse = await getVerse(decodedRef, translationId);
    return successResponse(verse);
  },
);
