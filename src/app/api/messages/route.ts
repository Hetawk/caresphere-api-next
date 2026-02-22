import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { getRequestUser } from "@/lib/request";
import { parsePaginationParams, paginationMeta } from "@/lib/pagination";
import { listMessages, createMessage } from "@/services/message.service";
import { MessageStatus, MessageType } from "@prisma/client";

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  messageType: z.nativeEnum(MessageType).optional(),
  scheduledFor: z.string().optional(),
  senderName: z.string().optional(),
  senderEmail: z.string().email().optional(),
  senderPhone: z.string().optional(),
  templateId: z.string().uuid().optional(),
  senderProfileId: z.string().uuid().optional(),
  recipientMemberIds: z.array(z.string().uuid()).optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  await getRequestUser(req);
  const sp = req.nextUrl.searchParams;
  const { page, limit } = parsePaginationParams(sp);
  const status = sp.get("status") as MessageStatus | null;
  const type = sp.get("type") as MessageType | null;

  const { items, total } = await listMessages({
    page,
    limit,
    status: status ?? undefined,
    type: type ?? undefined,
  });

  return successResponse(items, { metadata: paginationMeta(total, page, limit) });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.message);

  const message = await createMessage(parsed.data, currentUser.id);
  return successResponse(message, { status: 201 });
});
