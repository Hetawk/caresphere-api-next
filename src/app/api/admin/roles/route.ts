import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { requireRoles } from "@/lib/request";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/** GET /api/admin/roles — list all roles for the current admin's organization */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const user = await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);
  if (!user.organizationId) throw new NotFoundError("Organization");

  const roles = await prisma.role.findMany({
    where: { organizationId: user.organizationId },
    include: {
      permissions: {
        include: { permission: true },
      },
      _count: { select: { organizationUsers: true } },
    },
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
  });

  return successResponse(roles);
});

/** POST /api/admin/roles — create a custom role */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireRoles(req, UserRole.SUPER_ADMIN);
  if (!user.organizationId) throw new NotFoundError("Organization");

  const body = await req.json();
  const { name, displayName, description, color, permissionIds } = body;

  if (!name || typeof name !== "string" || !name.trim())
    throw new ValidationError("name is required");
  if (!displayName || typeof displayName !== "string" || !displayName.trim())
    throw new ValidationError("displayName is required");

  // Make sure name is unique within this org
  const existing = await prisma.role.findFirst({
    where: {
      organizationId: user.organizationId,
      name: name.trim().toLowerCase(),
    },
  });
  if (existing)
    throw new ValidationError(
      `A role with name '${name}' already exists in your organization`,
    );

  const role = await prisma.role.create({
    data: {
      organizationId: user.organizationId,
      name: name.trim().toLowerCase(),
      displayName: displayName.trim(),
      description: description ?? null,
      color: color ?? "#6B7280",
      permissions:
        Array.isArray(permissionIds) && permissionIds.length > 0
          ? {
              create: permissionIds.map((pid: string) => ({
                permissionId: pid,
              })),
            }
          : undefined,
    },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { organizationUsers: true } },
    },
  });

  return successResponse(role);
});
