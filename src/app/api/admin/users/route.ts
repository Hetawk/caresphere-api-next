import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { requireRoles } from "@/lib/request";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { parsePaginationParams, paginationMeta } from "@/lib/pagination";

export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);
  const sp = req.nextUrl.searchParams;
  const { page, limit } = parsePaginationParams(sp);

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        organizationMemberships: {
          select: {
            organization: { select: { id: true, name: true } },
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count(),
  ]);

  return successResponse(users, { metadata: paginationMeta(total, page, limit) });
});
