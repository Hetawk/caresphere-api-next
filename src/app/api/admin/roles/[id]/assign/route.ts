import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { requireRoles } from "@/lib/request";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/roles/[id]/assign
 * Body: { userId: string }
 * Assigns a user's OrganizationUser membership to this role.
 */
export const POST = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const { id: roleId } = await ctx.params;
  const user = await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);
  if (!user.organizationId) throw new NotFoundError("Organization");

  const body = await req.json();
  const { userId } = body;
  if (!userId || typeof userId !== "string")
    throw new ValidationError("userId is required");

  // Verify role belongs to this org
  const role = await prisma.role.findFirst({
    where: { id: roleId, organizationId: user.organizationId },
  });
  if (!role) throw new NotFoundError("Role");

  // Find the target user's membership in this org
  const membership = await prisma.organizationUser.findFirst({
    where: { userId, organizationId: user.organizationId },
  });
  if (!membership)
    throw new NotFoundError("User is not a member of your organization");

  // Prevent reducing the org owner's role
  if (membership.isOwner)
    throw new ValidationError(
      "Cannot change the role of the organization owner",
    );

  const updated = await prisma.organizationUser.update({
    where: { id: membership.id },
    data: { roleId },
    include: {
      role: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return successResponse(updated);
});

/**
 * DELETE /api/admin/roles/[id]/assign
 * Body: { userId: string }
 * Removes the user from this role (assigns them to the default 'member' role instead).
 */
export const DELETE = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const { id: roleId } = await ctx.params;
  const user = await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);
  if (!user.organizationId) throw new NotFoundError("Organization");

  const body = await req.json();
  const { userId } = body;
  if (!userId || typeof userId !== "string")
    throw new ValidationError("userId is required");

  const membership = await prisma.organizationUser.findFirst({
    where: { userId, organizationId: user.organizationId, roleId },
  });
  if (!membership) throw new NotFoundError("User is not assigned to this role");
  if (membership.isOwner)
    throw new ValidationError("Cannot unassign the organization owner");

  // Fall back to default member role
  const memberRole = await prisma.role.findFirst({
    where: { organizationId: user.organizationId, name: "member" },
  });

  const updated = await prisma.organizationUser.update({
    where: { id: membership.id },
    data: { roleId: memberRole?.id ?? null },
    include: {
      role: true,
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  return successResponse(updated);
});
