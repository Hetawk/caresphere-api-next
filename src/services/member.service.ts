/**
 * Member service — CRUD, search, notes, activities.
 * TypeScript port of caresphere-api/app/services/member_service.py
 */

import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { MemberStatus, Gender, Prisma } from "@prisma/client";
import { toPrismaPage } from "@/lib/pagination";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MemberCreateInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  memberStatus?: MemberStatus;
  membershipType?: string;
  joinDate?: string;
  photoUrl?: string;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  workSchool?: string;
  whatsappNumber?: string;
  wechatId?: string;
  hearAboutUs?: string;
  involvement?: string;
  comments?: string;
  consentGiven?: boolean;
}

export interface MemberSearchInput {
  query?: string;
  status?: MemberStatus;
  tags?: string[];
  page?: number;
  limit?: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export async function listMembers(opts: {
  page: number;
  limit: number;
  status?: MemberStatus;
  search?: string;
  organizationId?: string;
}) {
  const where: Prisma.MemberWhereInput = {};
  if (opts.organizationId) where.organizationId = opts.organizationId;
  if (opts.status) where.memberStatus = opts.status;
  if (opts.search) {
    where.OR = [
      { firstName: { contains: opts.search, mode: "insensitive" } },
      { lastName: { contains: opts.search, mode: "insensitive" } },
      { email: { contains: opts.search, mode: "insensitive" } },
      { phone: { contains: opts.search } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.member.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toPrismaPage(opts.page, opts.limit),
    }),
    prisma.member.count({ where }),
  ]);

  return { items, total };
}

export async function getMember(id: string) {
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) throw new NotFoundError("Member");
  return member;
}

export async function createMember(
  data: MemberCreateInput,
  createdBy?: string,
  organizationId?: string,
) {
  return prisma.member.create({
    data: {
      ...data,
      organizationId,
      createdBy,
      tags: data.tags ?? [],
      customFields: (data.customFields ?? {}) as Prisma.InputJsonValue,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
    },
  });
}

export async function updateMember(
  id: string,
  data: Partial<MemberCreateInput>,
) {
  await getMember(id); // throws if not found
  return prisma.member.update({
    where: { id },
    data: {
      ...data,
      tags: data.tags,
      customFields: data.customFields as Prisma.InputJsonValue | undefined,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
    },
  });
}

export async function deleteMember(id: string) {
  await getMember(id);
  return prisma.member.delete({ where: { id } });
}

export async function searchMembers(payload: MemberSearchInput) {
  const page = payload.page ?? 1;
  const limit = payload.limit ?? 20;

  const where: Prisma.MemberWhereInput = {};
  if (payload.status) where.memberStatus = payload.status;
  if (payload.query) {
    where.OR = [
      { firstName: { contains: payload.query, mode: "insensitive" } },
      { lastName: { contains: payload.query, mode: "insensitive" } },
      { email: { contains: payload.query, mode: "insensitive" } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.member.findMany({
      where,
      ...toPrismaPage(page, limit),
      orderBy: { createdAt: "desc" },
    }),
    prisma.member.count({ where }),
  ]);

  return { items, total };
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function listNotes(memberId: string) {
  await getMember(memberId);
  return prisma.memberNote.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
  });
}

export async function addNote(
  memberId: string,
  note: string,
  noteType?: string,
  isPrivate?: boolean,
  createdBy?: string,
) {
  await getMember(memberId);
  return prisma.memberNote.create({
    data: {
      memberId,
      note,
      noteType,
      isPrivate: isPrivate ?? false,
      createdBy,
    },
  });
}

// ─── Activities ───────────────────────────────────────────────────────────────

export async function listActivities(memberId: string) {
  await getMember(memberId);
  return prisma.memberActivity.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
  });
}

export async function logActivity(
  memberId: string,
  activityType: string,
  opts?: {
    description?: string;
    metadata?: Record<string, unknown>;
    performedBy?: string;
    createdBy?: string;
  },
) {
  return prisma.memberActivity.create({
    data: {
      memberId,
      activityType,
      description: opts?.description,
      createdBy: opts?.performedBy ?? opts?.createdBy,
    },
  });
}
