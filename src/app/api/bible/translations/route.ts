/**
 * GET /api/bible/translations
 * List all available Bible translations/versions from YouVersion.
 * Cached for 30 days. Requires authentication.
 *
 * Query params:
 *   language (optional) — ISO 639 language tag, e.g. "eng", "spa", "fra"
 */

import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { getTranslations } from "@/services/bible.service";

export const GET = withErrorHandling(async (req: NextRequest) => {
  await getRequestUser(req); // auth check
  const language = req.nextUrl.searchParams.get("language") ?? undefined;
  const translations = await getTranslations(language);
  return successResponse(translations);
});
