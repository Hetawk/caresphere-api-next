/**
 * Organization service — creation, join, admin checks.
 * TypeScript port of caresphere-api/app/services/organization_service.py
 */

import { prisma } from "@/lib/prisma";
import { generateOrgCode } from "@/lib/auth";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { OrganizationType, UserRole } from "@prisma/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

async function uniqueOrgCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateOrgCode();
    const exists = await prisma.organization.findUnique({
      where: { organizationCode: code },
    });
    if (!exists) return code;
  }
  throw new Error("Failed to generate unique organization code");
}

// ─── Service ─────────────────────────────────────────────────────────────────

export async function createOrganization(
  data: {
    name: string;
    organizationType?: OrganizationType;
    description?: string;
    logoUrl?: string;
    website?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    timezone?: string;
    domain?: string;
  },
  creatorId: string,
) {
  const { name, domain, organizationType = OrganizationType.CHURCH } = data;
  const code = await uniqueOrgCode();
  const slug = toSlug(name);
  // Churches auto-get Bible features enabled
  const bibleEnabled = organizationType === OrganizationType.CHURCH;

  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      domain,
      organizationCode: code,
      organizationType,
      bibleEnabled,
      description: data.description,
      logoUrl: data.logoUrl,
      website: data.website,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      timezone: data.timezone,
      isActive: true,
    },
  });

  // Create super_admin role for this org
  const superAdminRole = await prisma.role.create({
    data: {
      organizationId: org.id,
      name: "super_admin",
      displayName: "Super Administrator",
      description: "Full control over the organization",
      isSystem: true,
    },
  });

  // Link creator as owner with super_admin role
  await prisma.organizationUser.create({
    data: {
      userId: creatorId,
      organizationId: org.id,
      roleId: superAdminRole.id,
      isOwner: true,
      joinedAt: new Date(),
    },
  });

  // Update user's organizationId
  await prisma.user.update({
    where: { id: creatorId },
    data: { organizationId: org.id, role: UserRole.SUPER_ADMIN },
  });

  return prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
}

export async function joinOrganization(code: string, userId: string) {
  const org = await prisma.organization.findUnique({
    where: { organizationCode: code.toUpperCase() },
  });

  if (!org || !org.isActive) return null;

  // Already a member?
  const existing = await prisma.organizationUser.findFirst({
    where: { userId, organizationId: org.id },
  });
  if (existing) return org;

  // Get or create member role
  let memberRole = await prisma.role.findFirst({
    where: { organizationId: org.id, name: "member" },
  });
  if (!memberRole) {
    memberRole = await prisma.role.create({
      data: {
        organizationId: org.id,
        name: "member",
        displayName: "Member",
        description: "Standard organization member",
        isSystem: false,
      },
    });
  }

  await prisma.organizationUser.create({
    data: {
      userId,
      organizationId: org.id,
      roleId: memberRole.id,
      isOwner: false,
      joinedAt: new Date(),
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { organizationId: org.id },
  });

  return org;
}

export async function getUserOrganization(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.organizationId) return null;
  return prisma.organization.findUnique({ where: { id: user.organizationId } });
}

export async function isOrgAdmin(
  userId: string,
  orgId: string,
): Promise<boolean> {
  const membership = await prisma.organizationUser.findFirst({
    where: { userId, organizationId: orgId },
    include: { role: true },
  });
  if (!membership) return false;
  if (membership.isOwner) return true;
  return (
    !!membership.role && ["super_admin", "admin"].includes(membership.role.name)
  );
}

export async function regenerateCode(
  orgId: string,
  _reason?: string,
): Promise<string> {
  const newCode = await uniqueOrgCode();
  await prisma.organization.update({
    where: { id: orgId },
    data: { organizationCode: newCode },
  });
  return newCode;
}

export async function getOrgById(id: string) {
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) throw new NotFoundError("Organization");
  return org;
}

export async function validateOrgExists(id: string) {
  const count = await prisma.organization.count({ where: { id } });
  if (!count) throw new NotFoundError("Organization");
}

/** Return all organizations the user belongs to, with their role in each. */
export async function getUserAllOrganizations(userId: string) {
  const memberships = await prisma.organizationUser.findMany({
    where: { userId },
    include: {
      organization: true,
      role: { select: { name: true, displayName: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return memberships.map((m) => ({
    ...m.organization,
    membership: {
      isOwner: m.isOwner,
      roleName: m.role?.name ?? "member",
      roleDisplayName: m.role?.displayName ?? "Member",
      joinedAt: m.joinedAt,
    },
  }));
}

/** Switch the user's active (default) organization. */
export async function switchActiveOrganization(userId: string, orgId: string) {
  // Verify the user is actually a member of the target org
  const membership = await prisma.organizationUser.findFirst({
    where: { userId, organizationId: orgId },
  });
  if (!membership) throw new NotFoundError("Organization membership");

  await prisma.user.update({
    where: { id: userId },
    data: { organizationId: orgId },
  });

  return prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
}
