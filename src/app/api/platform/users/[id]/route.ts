/**
 * /api/platform/users/[id]
 * KINGDOM_SUPER_ADMIN only — update any user's role or organisation assignment.
 */
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { requireKingdomAdmin } from "@/lib/request";
import { prisma } from "@/lib/prisma";
import { UserRole, UserStatus } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/platform/users/[id] */
export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  await requireKingdomAdmin(req);
  const { id } = await ctx.params;

  const user = await prisma.user.findUnique({
    where: { id },
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
        include: {
          organization: { select: { id: true, name: true } },
          role: { select: { name: true, displayName: true } },
        },
      },
    },
  });
  if (!user) throw new NotFoundError("User");

  return successResponse(user);
});

/**
 * PATCH /api/platform/users/[id]
 * Allows KINGDOM_SUPER_ADMIN to:
 *  - Change any user's platform role (incl. promoting to SUPER_ADMIN)
 *  - Change user's active organisation (org code auto-generated — not changed here)
 *  - Suspend / reactivate a user
 */
export const PATCH = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  await requireKingdomAdmin(req);
  const { id } = await ctx.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError("User");

  const body = await req.json();
  const { role, status, organizationId } = body;

  // Validate role if provided
  if (role !== undefined && !Object.values(UserRole).includes(role))
    throw new ValidationError(
      `role must be one of: ${Object.values(UserRole).join(", ")}`,
    );

  // Validate status if provided
  if (status !== undefined && !Object.values(UserStatus).includes(status))
    throw new ValidationError(
      `status must be one of: ${Object.values(UserStatus).join(", ")}`,
    );

  // Validate organizationId if provided
  if (organizationId !== undefined) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) throw new NotFoundError("Organization");
    if (!org.isActive) throw new ValidationError("Organization is not active");
  }

  const updateData: Record<string, unknown> = {};
  if (role !== undefined) updateData.role = role;
  if (status !== undefined) updateData.status = status;
  if (organizationId !== undefined) updateData.organizationId = organizationId;

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      organizationId: true,
    },
  });

  // If organisation was changed, create org membership if it doesn't exist
  if (organizationId && organizationId !== user.organizationId) {
    const existing = await prisma.organizationUser.findFirst({
      where: { userId: id, organizationId },
    });

    if (!existing) {
      // Get or create the default member role for that org
      let memberRole = await prisma.role.findFirst({
        where: { organizationId, name: "member" },
      });
      if (!memberRole) {
        memberRole = await prisma.role.create({
          data: {
            organizationId,
            name: "member",
            displayName: "Member",
            description: "Standard organization member",
          },
        });
      }

      await prisma.organizationUser.create({
        data: {
          userId: id,
          organizationId,
          roleId: memberRole.id,
          joinedAt: new Date(),
        },
      });
    }
  }

  return successResponse(updated);
});
