import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from "@/lib/errors";
import { requireRoles } from "@/lib/request";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/roles/[id] — get a single role with members */
export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);
  if (!user.organizationId) throw new NotFoundError("Organization");

  const role = await prisma.role.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      permissions: { include: { permission: true } },
      organizationUsers: {
        include: {
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
      },
    },
  });
  if (!role) throw new NotFoundError("Role");

  return successResponse(role);
});

/** PATCH /api/admin/roles/[id] — update a custom role */
export const PATCH = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await requireRoles(req, UserRole.SUPER_ADMIN);
  if (!user.organizationId) throw new NotFoundError("Organization");

  const role = await prisma.role.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!role) throw new NotFoundError("Role");
  if (role.isSystem)
    throw new AuthorizationError("System roles cannot be modified");

  const body = await req.json();
  const { displayName, description, color, permissionIds } = body;

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (displayName !== undefined) {
    if (typeof displayName !== "string" || !displayName.trim())
      throw new ValidationError("displayName must be a non-empty string");
    updateData.displayName = displayName.trim();
  }
  if (description !== undefined) updateData.description = description;
  if (color !== undefined) updateData.color = color;

  // Replace permissions if provided
  if (Array.isArray(permissionIds)) {
    // Delete existing and recreate
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((pid: string) => ({
          roleId: id,
          permissionId: pid,
        })),
        skipDuplicates: true,
      });
    }
  }

  const updated = await prisma.role.update({
    where: { id },
    data: updateData,
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { organizationUsers: true } },
    },
  });

  return successResponse(updated);
});

/** DELETE /api/admin/roles/[id] — delete a custom (non-system) role */
export const DELETE = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await requireRoles(req, UserRole.SUPER_ADMIN);
  if (!user.organizationId) throw new NotFoundError("Organization");

  const role = await prisma.role.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { _count: { select: { organizationUsers: true } } },
  });
  if (!role) throw new NotFoundError("Role");
  if (role.isSystem)
    throw new AuthorizationError("System roles cannot be deleted");
  if (role._count.organizationUsers > 0)
    throw new ValidationError(
      `Cannot delete role '${role.displayName}' — ${role._count.organizationUsers} member(s) are currently assigned to it. Reassign them first.`,
    );

  await prisma.rolePermission.deleteMany({ where: { roleId: id } });
  await prisma.role.delete({ where: { id } });

  return successResponse({ message: "Role deleted successfully" });
});
