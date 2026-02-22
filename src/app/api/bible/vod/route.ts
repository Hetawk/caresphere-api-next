/**
 * GET  /api/bible/verse-of-day  — Retrieve today's Verse of the Day for the org.
 * POST /api/bible/verse-of-day  — Admin: manually set (or override) a VOTD.
 *
 * Bible features must be enabled on the organization (bibleEnabled = true).
 * Churches have this enabled by default.
 *
 * GET query params:
 *   date      — ISO date string YYYY-MM-DD (optional, defaults to today)
 *
 * POST body:
 *   reference       string   — USFM reference (e.g. "JHN.3.16")
 *   translationId   string?  — version ID (defaults to org setting or KJV)
 *   verseText       string?  — pre-fetched text; omit to auto-fetch
 *   scheduledDate   string?  — ISO date (defaults to today)
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { ValidationError } from "@/lib/errors";
import {
  getVerseOfDay,
  setVerseOfDay,
  requireBibleEnabled,
} from "@/services/bible.service";
import {
  getUserOrganization,
  isOrgAdmin,
} from "@/services/organization.service";
import { validate } from "@/lib/validate";

const setVotdSchema = z.object({
  reference: z.string().min(1),
  translationId: z.string().optional(),
  verseText: z.string().optional(),
  scheduledDate: z.string().optional(), // ISO date
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const org = await getUserOrganization(currentUser.id);
  if (!org) throw new ValidationError("You must be part of an organization");
  await requireBibleEnabled(org.id);

  const dateParam = req.nextUrl.searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : undefined;

  const votd = await getVerseOfDay(org.id, date);
  return successResponse(votd);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const org = await getUserOrganization(currentUser.id);
  if (!org) throw new ValidationError("You must be part of an organization");
  await requireBibleEnabled(org.id);

  // Only admins can set/override VOTD
  const admin = await isOrgAdmin(currentUser.id, org.id);
  if (!admin)
    throw new ValidationError(
      "Only organization admins can set the verse of the day",
    );

  const { reference, translationId, verseText, scheduledDate } = validate(
    setVotdSchema,
    await req.json(),
  );
  const result = await setVerseOfDay(
    org.id,
    {
      reference,
      translationId,
      verseText,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      isAutomatic: false,
    },
    currentUser.id,
  );
  return successResponse(result);
});
