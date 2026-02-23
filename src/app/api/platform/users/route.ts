/**
 * /api/platform/users
 * KINGDOM_SUPER_ADMIN only — list all users across the entire platform.
 */
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { requireKingdomAdmin } from "@/lib/request";
import { prisma } from "@/lib/prisma";

export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireKingdomAdmin(req);

  const sp = req.nextUrl.searchParams;
  const search = sp.get("q") ?? "";
  const orgId = sp.get("orgId") ?? undefined;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 20)));

  const where: Record<string, unknown> = {};
  if (orgId) where.organizationId = orgId;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        organization: {
          select: { id: true, name: true, organizationCode: true },
        },
        organizationMemberships: {
          select: {
            isOwner: true,
            role: { select: { name: true, displayName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return successResponse({
    items: users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});
