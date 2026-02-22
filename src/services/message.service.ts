/**
 * Message service — CRUD, send, analytics.
 * TypeScript port of caresphere-api/app/services/message_service.py
 */

import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { MessageStatus, MessageType, Prisma } from "@prisma/client";
import { toPrismaPage } from "@/lib/pagination";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MessageCreateInput {
  title: string;
  content: string;
  messageType?: MessageType;
  scheduledFor?: string;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  templateId?: string;
  senderProfileId?: string;
  recipientMemberIds?: string[];
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function listMessages(opts: {
  page: number;
  limit: number;
  status?: MessageStatus;
  type?: MessageType;
}) {
  const where: Prisma.MessageWhereInput = {};
  if (opts.status) where.status = opts.status;
  if (opts.type) where.messageType = opts.type;

  const [items, total] = await prisma.$transaction([
    prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toPrismaPage(opts.page, opts.limit),
    }),
    prisma.message.count({ where }),
  ]);

  return { items, total };
}

export async function getMessage(id: string) {
  const msg = await prisma.message.findUnique({
    where: { id },
    include: { template: true, senderProfile: true },
  });
  if (!msg) throw new NotFoundError("Message");
  return msg;
}

export async function createMessage(
  data: MessageCreateInput,
  createdBy: string,
) {
  const { recipientMemberIds, ...rest } = data;

  const message = await prisma.message.create({
    data: {
      ...rest,
      status: MessageStatus.DRAFT,
      messageType: data.messageType ?? MessageType.EMAIL,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
      createdBy,
    },
  });

  // Optionally pre-populate recipients
  if (recipientMemberIds?.length) {
    const members = await prisma.member.findMany({
      where: { id: { in: recipientMemberIds } },
      select: { id: true, email: true, phone: true },
    });
    await prisma.messageRecipient.createMany({
      data: members.map((m) => ({
        messageId: message.id,
        memberId: m.id,
        recipientEmail: m.email ?? undefined,
        recipientPhone: m.phone ?? undefined,
      })),
    });
  }

  return message;
}

export async function updateMessage(
  id: string,
  data: Partial<MessageCreateInput>,
) {
  const msg = await getMessage(id);
  if (msg.status === MessageStatus.SENT) {
    throw new ValidationError({ status: "Cannot edit a sent message" });
  }
  return prisma.message.update({
    where: { id },
    data: {
      ...data,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
    },
  });
}

export async function deleteMessage(id: string) {
  await getMessage(id);
  return prisma.message.delete({ where: { id } });
}

export async function sendMessage(id: string) {
  const msg = await getMessage(id);
  if (msg.status === MessageStatus.SENT) {
    throw new ValidationError({ status: "Message already sent" });
  }

  // Mark as sending → sent (actual delivery handled by a worker in prod)
  return prisma.message.update({
    where: { id },
    data: { status: MessageStatus.SENT, sentAt: new Date() },
  });
}

export async function getMessageAnalytics(id: string) {
  const msg = await getMessage(id);
  return {
    messageId: msg.id,
    title: msg.title,
    status: msg.status,
    recipientCount: msg.recipientCount,
    openedCount: msg.openedCount,
    clickedCount: msg.clickedCount,
    failedCount: msg.failedCount,
    openRate: msg.recipientCount > 0 ? msg.openedCount / msg.recipientCount : 0,
    clickRate:
      msg.recipientCount > 0 ? msg.clickedCount / msg.recipientCount : 0,
    sentAt: msg.sentAt,
  };
}

// ─── Sender Profiles ──────────────────────────────────────────────────────────

export async function listSenderProfiles(organizationId?: string) {
  return prisma.messageSenderProfile.findMany({
    where: organizationId ? { organizationId } : {},
    orderBy: { createdAt: "desc" },
  });
}

export async function createSenderProfile(
  data: { name: string; email?: string; phone?: string; isDefault?: boolean },
  createdBy: string,
  organizationId?: string,
) {
  return prisma.messageSenderProfile.create({
    data: { ...data, createdBy, organizationId },
  });
}

export async function updateSenderProfile(
  id: string,
  data: { name?: string; email?: string; phone?: string; isDefault?: boolean },
) {
  const profile = await prisma.messageSenderProfile.findUnique({
    where: { id },
  });
  if (!profile) throw new NotFoundError("Sender profile");
  return prisma.messageSenderProfile.update({ where: { id }, data });
}

export async function deleteSenderProfile(id: string) {
  const profile = await prisma.messageSenderProfile.findUnique({
    where: { id },
  });
  if (!profile) throw new NotFoundError("Sender profile");
  return prisma.messageSenderProfile.delete({ where: { id } });
}
