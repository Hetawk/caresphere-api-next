/**
 * GET  /api/bible/notes  — List the authenticated user's Bible notes.
 * POST /api/bible/notes  — Create a new note on a verse.
 *
 * GET query params:
 *   reference (optional) — filter by USFM reference
 *
 * POST body:
 *   reference     string  — USFM reference
 *   translationId string  — YouVersion version ID
 *   noteText      string  — Note content
 *   isPrivate     boolean? — Whether note is private (default: true)
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { getNotes, createNote } from "@/services/bible.service";
import { validate } from "@/lib/validate";

const createSchema = z.object({
  reference: z.string().min(1),
  translationId: z.string().min(1),
  noteText: z.string().min(1),
  isPrivate: z.boolean().optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const reference = req.nextUrl.searchParams.get("reference") ?? undefined;
  const notes = await getNotes(currentUser.id, reference);
  return successResponse(notes);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const data = validate(createSchema, await req.json());

  const note = await createNote(currentUser.id, data);
  return successResponse(note);
});
