/**
 * POST /api/messages/send
 * Combined create-and-send endpoint used by the mobile app.
 * Creates a message and immediately triggers delivery in one request.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { createMessage, sendMessage } from "@/services/message.service";
import { MessageType } from "@prisma/client";
import { validate } from "@/lib/validate";

const schema = z.object({
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
  recipientEmails: z.array(z.string().email()).optional(),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const data = validate(schema, await req.json());

  // Step 1: create the message
  const message = await createMessage(data, currentUser.id);

  // Step 2: immediately send it
  const sent = await sendMessage(message.id);

  return successResponse(sent, { status: 201 });
});
