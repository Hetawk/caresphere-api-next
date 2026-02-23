import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from "@/lib/errors";
import { getRequestUser } from "@/lib/request";
import {
  getUserOrganization,
  isOrgAdmin,
} from "@/services/organization.service";
import { prisma } from "@/lib/prisma";
import { OrganizationType } from "@prisma/client";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const org = await getUserOrganization(currentUser.id);
  if (!org) throw new NotFoundError("Organization");
  return successResponse(org);
});

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const org = await getUserOrganization(currentUser.id);
  if (!org) throw new NotFoundError("Organization");

  const admin = await isOrgAdmin(currentUser.id, org.id);
  if (!admin)
    throw new AuthorizationError(
      "Admin access required to update organization settings",
    );

  const body = await req.json();
  const {
    name,
    phone,
    address,
    website,
    description,
    organizationType,
    bibleEnabled,
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

  // Build update payload — only include defined fields
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name.trim();
  if (phone !== undefined) updateData.phone = phone;
  if (address !== undefined) updateData.address = address;
  if (website !== undefined) updateData.website = website;
  if (description !== undefined) updateData.description = description;
  if (organizationType !== undefined) {
    updateData.organizationType = organizationType;
    // When switching to CHURCH auto-enable Bible if caller didn't explicitly set it
    if (bibleEnabled === undefined) {
      updateData.bibleEnabled = organizationType === OrganizationType.CHURCH;
    }
  }
  if (bibleEnabled !== undefined)
    updateData.bibleEnabled = Boolean(bibleEnabled);

  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: updateData,
  });

  return successResponse(updated);
});
