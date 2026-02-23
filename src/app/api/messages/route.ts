import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate } from "@/lib/validate";
import { getRequestUser } from "@/lib/request";
import { parsePaginationParams, paginationMeta } from "@/lib/pagination";
import { listMessages, createMessage } from "@/services/message.service";
import { getUserOrganization } from "@/services/organization.service";
import { MessageStatus, MessageType } from "@prisma/client";

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  messageType: z.nativeEnum(MessageType).optional(),
  scheduledFor: z.string().optional(),
  senderName: z.string().optional(),
  senderEmail: z.string().email().optional(),
  senderPhone: z.string().optional(),
  senderWhatsapp: z.string().optional(),
  channelLabel: z.string().optional(),
  templateId: z.string().uuid().optional(),
  senderProfileId: z.string().uuid().optional(),
  recipientMemberIds: z.array(z.string().uuid()).optional(),
  recipientGroup: z.enum(["ALL", "ACTIVE", "INACTIVE", "PENDING"]).optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const sp = req.nextUrl.searchParams;
  const { page, limit } = parsePaginationParams(sp);
  const status = sp.get("status") as MessageStatus | null;
  const type = sp.get("type") as MessageType | null;

  // Scope messages to the caller's org via createdBy filter for now
  const { items, total } = await listMessages({
    page,
    limit,
    status: status ?? undefined,
    type: type ?? undefined,
    createdBy: currentUser.id,
  });

  return successResponse({ items, ...paginationMeta(total, page, limit) });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const org = await getUserOrganization(currentUser.id);
  const body = validate(createSchema, await req.json());
  const message = await createMessage(
    { ...body, organizationId: org?.id },
    currentUser.id,
  );
  return successResponse(message, { status: 201 });
});
