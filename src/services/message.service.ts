/**
 * Message service — CRUD, send, analytics.
 * TypeScript port of caresphere-api/app/services/message_service.py
 */

import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { MessageStatus, MessageType, Prisma } from "@prisma/client";
import { toPrismaPage } from "@/lib/pagination";

// ─── Types ───────────────────────────────────────────────────────────────────

export type RecipientGroup = "ALL" | "ACTIVE" | "INACTIVE" | "PENDING";

export interface MessageCreateInput {
  title: string;
  content: string;
  messageType?: MessageType;
  scheduledFor?: string;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  senderWhatsapp?: string;
  templateId?: string;
  senderProfileId?: string;
  recipientMemberIds?: string[];
  recipientEmails?: string[];
  /** Bulk-select members by status group */
  recipientGroup?: RecipientGroup;
  /** Org scope for bulk recipient resolution */
  organizationId?: string;
  /** Human-readable channel label stored in metadata */
  channelLabel?: string;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function listMessages(opts: {
  page: number;
  limit: number;
  status?: MessageStatus;
  type?: MessageType;
  createdBy?: string;
}) {
  const where: Prisma.MessageWhereInput = {};
  if (opts.status) where.status = opts.status;
  if (opts.type) where.messageType = opts.type;
  if (opts.createdBy) where.createdBy = opts.createdBy;

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
    include: {
      template: true,
      senderProfile: true,
      recipients: {
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      } as Prisma.Message$recipientsArgs,
    },
  });
  if (!msg) throw new NotFoundError("Message");
  return msg;
}

export async function createMessage(
  data: MessageCreateInput,
  createdBy: string,
) {
  const {
    recipientMemberIds,
    recipientEmails,
    recipientGroup,
    organizationId,
    channelLabel,
    senderWhatsapp,
    ...rest
  } = data;

  const msgType = data.messageType ?? MessageType.EMAIL;

  const message = await prisma.message.create({
    data: {
      ...rest,
      messageType: msgType,
      status: data.scheduledFor ? MessageStatus.SCHEDULED : MessageStatus.DRAFT,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
      createdBy,
      messageMetadata: {
        ...(channelLabel ? { channelLabel } : {}),
        ...(senderWhatsapp ? { senderWhatsapp } : {}),
        ...(recipientGroup ? { recipientGroup } : {}),
      },
    },
  });

  // Resolve recipients from explicit IDs
  let members: {
    id: string;
    email: string | null;
    phone: string | null;
    whatsappNumber: string | null;
  }[] = [];

  if (recipientMemberIds?.length) {
    members = await prisma.member.findMany({
      where: { id: { in: recipientMemberIds } },
      select: { id: true, email: true, phone: true, whatsappNumber: true },
    });
  } else if (recipientGroup) {
    // Bulk-select members by group
    const where: Record<string, unknown> = organizationId
      ? { organizationId }
      : {};
    if (recipientGroup !== "ALL") {
      where.memberStatus = recipientGroup;
    }
    members = await prisma.member.findMany({
      where,
      select: { id: true, email: true, phone: true, whatsappNumber: true },
    });
  }

  const normalizedEmails = Array.from(
    new Set(
      (recipientEmails ?? [])
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  const memberEmails = new Set(
    members
      .map((m) => m.email?.trim().toLowerCase())
      .filter((v): v is string => Boolean(v)),
  );

  const emailOnlyRecipients = normalizedEmails.filter(
    (e) => !memberEmails.has(e),
  );

  if (members.length > 0 || emailOnlyRecipients.length > 0) {
    await prisma.messageRecipient.createMany({
      data: [
        ...members.map((m) => ({
          messageId: message.id,
          memberId: m.id,
          recipientEmail: m.email ?? undefined,
          recipientPhone:
            msgType === MessageType.SMS
              ? (m.phone ?? undefined)
              : msgType === MessageType.PUSH
                ? (m.whatsappNumber ?? m.phone ?? undefined) // PUSH = WhatsApp channel
                : (m.phone ?? undefined),
        })),
        ...emailOnlyRecipients.map((email) => ({
          messageId: message.id,
          recipientEmail: email,
        })),
      ],
    });

    // Update recipient count
    await prisma.message.update({
      where: { id: message.id },
      data: { recipientCount: members.length + emailOnlyRecipients.length },
    });
  }

  return prisma.message.findUnique({ where: { id: message.id } }) as Promise<
    NonNullable<Awaited<ReturnType<typeof prisma.message.findUnique>>>
  >;
}

export async function updateMessage(
  id: string,
  data: Partial<MessageCreateInput>,
) {
  const msg = await getMessage(id);
  if (msg.status === MessageStatus.SENT) {
    throw new ValidationError({ status: "Cannot edit a sent message" });
  }

  const {
    recipientMemberIds,
    recipientEmails,
    recipientGroup,
    organizationId,
    channelLabel,
    senderWhatsapp,
    ...rest
  } = data;

  const updated = await prisma.message.update({
    where: { id },
    data: {
      ...rest,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
      ...(channelLabel || senderWhatsapp || recipientGroup
        ? {
            messageMetadata: {
              ...((msg.messageMetadata as Record<string, unknown> | null) ??
                {}),
              ...(channelLabel ? { channelLabel } : {}),
              ...(senderWhatsapp ? { senderWhatsapp } : {}),
              ...(recipientGroup ? { recipientGroup } : {}),
            },
          }
        : {}),
    },
  });

  if (
    recipientMemberIds !== undefined ||
    recipientEmails !== undefined ||
    recipientGroup !== undefined
  ) {
    let members: {
      id: string;
      email: string | null;
      phone: string | null;
      whatsappNumber: string | null;
    }[] = [];

    if (recipientMemberIds?.length) {
      members = await prisma.member.findMany({
        where: { id: { in: recipientMemberIds } },
        select: { id: true, email: true, phone: true, whatsappNumber: true },
      });
    } else if (recipientGroup) {
      const where: Record<string, unknown> = organizationId
        ? { organizationId }
        : {};
      if (recipientGroup !== "ALL") {
        where.memberStatus = recipientGroup;
      }
      members = await prisma.member.findMany({
        where,
        select: { id: true, email: true, phone: true, whatsappNumber: true },
      });
    }

    const normalizedEmails = Array.from(
      new Set(
        (recipientEmails ?? [])
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean),
      ),
    );

    const memberEmails = new Set(
      members
        .map((m) => m.email?.trim().toLowerCase())
        .filter((v): v is string => Boolean(v)),
    );
    const emailOnlyRecipients = normalizedEmails.filter(
      (e) => !memberEmails.has(e),
    );

    await prisma.$transaction([
      prisma.messageRecipient.deleteMany({ where: { messageId: id } }),
      ...(members.length > 0 || emailOnlyRecipients.length > 0
        ? [
            prisma.messageRecipient.createMany({
              data: [
                ...members.map((m) => ({
                  messageId: id,
                  memberId: m.id,
                  recipientEmail: m.email ?? undefined,
                  recipientPhone:
                    updated.messageType === MessageType.SMS
                      ? (m.phone ?? undefined)
                      : updated.messageType === MessageType.PUSH
                        ? (m.whatsappNumber ?? m.phone ?? undefined)
                        : (m.phone ?? undefined),
                })),
                ...emailOnlyRecipients.map((email) => ({
                  messageId: id,
                  recipientEmail: email,
                })),
              ],
            }),
          ]
        : []),
      prisma.message.update({
        where: { id },
        data: { recipientCount: members.length + emailOnlyRecipients.length },
      }),
    ]);
  }

  return prisma.message.findUniqueOrThrow({ where: { id } });
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

/**
 * Process all messages with status SCHEDULED whose scheduledFor time has passed.
 * Called by the /api/messages/dispatch cron route every minute.
 * Returns the number of messages dispatched.
 */
export async function sendScheduledMessages(): Promise<number> {
  const now = new Date();
  const due = await prisma.message.findMany({
    where: {
      status: MessageStatus.SCHEDULED,
      scheduledFor: { lte: now },
    },
    select: { id: true },
  });

  if (due.length === 0) return 0;

  await prisma.message.updateMany({
    where: { id: { in: due.map((m) => m.id) } },
    data: { status: MessageStatus.SENT, sentAt: now },
  });

  return due.length;
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
