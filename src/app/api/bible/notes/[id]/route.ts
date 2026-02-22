/**
 * PUT    /api/bible/notes/[id]  — Update a Bible note's text or privacy setting.
 * DELETE /api/bible/notes/[id]  — Remove a Bible note.
 *
 * Only the owner can update or delete their own notes.
 *
 * PUT body:
 *   noteText  string?   — Updated note text
 *   isPrivate boolean?  — Update privacy
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { updateNote, deleteNote } from "@/services/bible.service";
import { validate } from "@/lib/validate";

const updateSchema = z
  .object({
    noteText: z.string().min(1).optional(),
    isPrivate: z.boolean().optional(),
  })
  .refine((d) => d.noteText !== undefined || d.isPrivate !== undefined, {
    message: "Provide at least one field to update: noteText or isPrivate",
  });

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await getRequestUser(req);
    const { id } = await params;
    const data = validate(updateSchema, await req.json());

    const note = await updateNote(currentUser.id, id, data);
    return successResponse(note);
  },
);

export const DELETE = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await getRequestUser(req);
    const { id } = await params;
    await deleteNote(currentUser.id, id);
    return successResponse(null);
  },
);
