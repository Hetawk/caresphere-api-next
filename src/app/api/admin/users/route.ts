import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import {
  ValidationError,
  ConflictError,
  AuthorizationError,
} from "@/lib/errors";
import { requireRoles } from "@/lib/request";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { parsePaginationParams, paginationMeta } from "@/lib/pagination";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const actor = await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);

  if (!actor.organizationId)
    throw new ValidationError("You are not associated with an organisation");

  const sp = req.nextUrl.searchParams;
  const { page, limit } = parsePaginationParams(sp);

  // Only users in the same organisation, never expose KINGDOM_SUPER_ADMIN
  const where = {
    organizationId: actor.organizationId,
    role: { not: UserRole.KINGDOM_SUPER_ADMIN },
  };

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
    prisma.user.count({ where }),
  ]);

  return successResponse(users, {
    metadata: paginationMeta(total, page, limit),
  });
});

/** POST /api/admin/users — create a new user in the same organisation */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const actor = await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);
  if (!actor.organizationId)
    throw new ValidationError("You are not associated with an organisation");

  const body = await req.json();
  const { firstName, lastName, email, role, password } = body;

  if (!firstName || !lastName || !email || !password)
    throw new ValidationError(
      "firstName, lastName, email and password are all required",
    );

  // Validate role
  const userRole = (role ?? "MEMBER").toUpperCase() as UserRole;
  if (!Object.values(UserRole).includes(userRole))
    throw new ValidationError(`Invalid role: ${role}`);

  // KINGDOM_SUPER_ADMIN cannot be assigned through this route
  if (userRole === UserRole.KINGDOM_SUPER_ADMIN)
    throw new AuthorizationError(
      "KINGDOM_SUPER_ADMIN cannot be created through this route",
    );

  // ADMIN cannot create another SUPER_ADMIN
  if (actor.role === UserRole.ADMIN && userRole === UserRole.SUPER_ADMIN)
    throw new AuthorizationError("ADMINs cannot create SUPER_ADMINs");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    throw new ConflictError("A user with this email already exists");

  const passwordHash = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      passwordHash,
      role: userRole,
      organizationId: actor.organizationId,
      emailVerified: true, // Admin-created users are pre-verified
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return successResponse(newUser);
});
