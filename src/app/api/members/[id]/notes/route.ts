import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { getRequestUser } from "@/lib/request";
import { listNotes, addNote } from "@/services/member.service";

const createSchema = z.object({ content: z.string().min(1) });
type RouteParams = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(async (_req: NextRequest, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const notes = await listNotes(id);
  return successResponse(notes);
});

export const POST = withErrorHandling(async (req: NextRequest, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const currentUser = await getRequestUser(req);
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.message);

  const note = await addNote(id, parsed.data.content, currentUser.id);
  return successResponse(note, { status: 201 });
});
