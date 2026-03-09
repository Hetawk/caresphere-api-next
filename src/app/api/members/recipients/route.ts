import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { getUserOrganization } from "@/services/organization.service";
import { prisma } from "@/lib/prisma";

type RecipientItem = {
  id: string;
  memberId?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email?: string;
  phone?: string;
  source: "member" | "user";
};

export const GET = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const org = await getUserOrganization(currentUser.id);
  if (!org) return successResponse({ items: [] });

  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? 25) || 25,
    100,
  );

  const memberWhere = {
    organizationId: org.id,
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };

  const userWhere = {
    role: { not: UserRole.KINGDOM_SUPER_ADMIN },
    OR: [
      { organizationId: org.id },
      {
        organizationMemberships: {
          some: { organizationId: org.id, isActive: true },
        },
      },
    ],
    ...(search
      ? {
          AND: [
            {
              OR: [
                {
                  firstName: { contains: search, mode: "insensitive" as const },
                },
                {
                  lastName: { contains: search, mode: "insensitive" as const },
                },
                { email: { contains: search, mode: "insensitive" as const } },
                { phone: { contains: search } },
              ],
            },
          ],
        }
      : {}),
  };

  const [members, users] = await prisma.$transaction([
    prisma.member.findMany({
      where: memberWhere,
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: limit,
    }),
    prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: limit,
    }),
  ]);

  const items: RecipientItem[] = members.map((m) => ({
    id: `member:${m.id}`,
    memberId: m.id,
    userId: m.userId ?? undefined,
    firstName: m.firstName,
    lastName: m.lastName ?? undefined,
    name:
      [m.firstName, m.lastName].filter(Boolean).join(" ") ||
      m.email ||
      m.phone ||
      m.id,
    email: m.email ?? undefined,
    phone: m.phone ?? undefined,
    source: "member",
  }));

  const seenMemberIds = new Set(items.map((i) => i.memberId).filter(Boolean));
  const seenEmails = new Set(
    items
      .map((i) => i.email?.toLowerCase())
      .filter((v): v is string => Boolean(v)),
  );

  for (const u of users) {
    const email = u.email?.trim();
    const lowerEmail = email?.toLowerCase();
    if (lowerEmail && seenEmails.has(lowerEmail)) continue;
    if (seenMemberIds.has(u.id)) continue;

    items.push({
      id: `user:${u.id}`,
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName ?? undefined,
      name:
        [u.firstName, u.lastName].filter(Boolean).join(" ") || email || u.id,
      email: email ?? undefined,
      phone: u.phone ?? undefined,
      source: "user",
    });

    if (lowerEmail) seenEmails.add(lowerEmail);
  }

  return successResponse({ items: items.slice(0, limit) });
});
