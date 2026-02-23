/**
 * /api/platform/organizations/[id]
 * KINGDOM_SUPER_ADMIN only — update or soft-delete any organisation.
 */
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { requireKingdomAdmin } from "@/lib/request";
import { prisma } from "@/lib/prisma";
import { OrganizationType } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/platform/organizations/[id] */
export const GET = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  await requireKingdomAdmin(req);
  const { id } = await ctx.params;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, members: true } },
      roles: {
        include: { _count: { select: { organizationUsers: true } } },
        orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!org) throw new NotFoundError("Organization");

  return successResponse(org);
});

/** PATCH /api/platform/organizations/[id] — update any org field */
export const PATCH = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  await requireKingdomAdmin(req);
  const { id } = await ctx.params;

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) throw new NotFoundError("Organization");

  const body = await req.json();
  const {
    name,
    phone,
    address,
    website,
    description,
    organizationType,
    bibleEnabled,
    isActive,
  } = body;

  if (name !== undefined && typeof name !== "string")
    throw new ValidationError("name must be a string");
  if (name !== undefined && !name.trim())
    throw new ValidationError("Organization name cannot be empty");
  if (
    organizationType !== undefined &&
    !Object.values(OrganizationType).includes(organizationType)
  )
    throw new ValidationError(
      `organizationType must be one of: ${Object.values(OrganizationType).join(", ")}`,
    );

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name.trim();
  if (phone !== undefined) updateData.phone = phone;
  if (address !== undefined) updateData.address = address;
  if (website !== undefined) updateData.website = website;
  if (description !== undefined) updateData.description = description;
  if (organizationType !== undefined)
    updateData.organizationType = organizationType;
  if (bibleEnabled !== undefined)
    updateData.bibleEnabled = Boolean(bibleEnabled);
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);

  const updated = await prisma.organization.update({
    where: { id },
    data: updateData,
  });

  return successResponse(updated);
});

/** DELETE /api/platform/organizations/[id] — soft-delete (deactivate) any org */
export const DELETE = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  await requireKingdomAdmin(req);
  const { id } = await ctx.params;

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) throw new NotFoundError("Organization");

  await prisma.organization.update({
    where: { id },
    data: { isActive: false },
  });

  return successResponse({ message: "Organization deactivated successfully" });
});
