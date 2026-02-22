/**
 * GET  /api/bible/highlights  — List the authenticated user's Bible highlights.
 * POST /api/bible/highlights  — Add a new highlight (upserts on duplicate ref+translation).
 *
 * GET query params:
 *   reference (optional) — filter by USFM reference
 *
 * POST body:
 *   reference      string  — USFM reference
 *   translationId  string  — YouVersion version ID
 *   color          string? — Highlight color (default: "yellow")
 *   organizationId string? — Attach highlight to an org for shared highlights
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { ValidationError } from "@/lib/errors";
import { getHighlights, createHighlight } from "@/services/bible.service";

const createSchema = z.object({
  reference: z.string().min(1),
  translationId: z.string().min(1),
  color: z.string().optional(),
  organizationId: z.string().optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const reference = req.nextUrl.searchParams.get("reference") ?? undefined;
  const highlights = await getHighlights(currentUser.id, reference);
  return successResponse(highlights);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Invalid data",
    );

  const highlight = await createHighlight(currentUser.id, parsed.data);
  return successResponse(highlight);
});
