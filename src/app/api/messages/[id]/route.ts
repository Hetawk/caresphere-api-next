import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { getRequestUser } from "@/lib/request";
import {
  getMessage,
  updateMessage,
  deleteMessage,
} from "@/services/message.service";
import { MessageType } from "@prisma/client";

const updateSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  messageType: z.nativeEnum(MessageType).optional(),
  scheduledFor: z.string().optional(),
  senderName: z.string().optional(),
  senderEmail: z.string().email().optional(),
  senderPhone: z.string().optional(),
  templateId: z.string().uuid().optional(),
  senderProfileId: z.string().uuid().optional(),
  recipientMemberIds: z.array(z.string().uuid()).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    const message = await getMessage(id);
    return successResponse(message);
  },
);

export const PUT = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    await getRequestUser(req);
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const message = await updateMessage(id, parsed.data);
    return successResponse(message);
  },
);

export const DELETE = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    await getRequestUser(req);
    await deleteMessage(id);
    return successResponse({ message: "Message deleted" });
  },
);
