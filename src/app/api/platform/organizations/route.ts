/**
 * /api/platform/organizations
 * KINGDOM_SUPER_ADMIN only — platform-wide organisation management.
 */
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { requireKingdomAdmin } from "@/lib/request";
import { prisma } from "@/lib/prisma";
import { createOrganization } from "@/services/organization.service";
import { OrganizationType } from "@prisma/client";

/** GET /api/platform/organizations — list every org on the platform */
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireKingdomAdmin(req);

  const sp = req.nextUrl.searchParams;
  const search = sp.get("q") ?? "";
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 20)));

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { organizationCode: { contains: search.toUpperCase() } },
        ],
      }
    : {};

  const [orgs, total] = await prisma.$transaction([
    prisma.organization.findMany({
      where,
      include: {
        _count: { select: { users: true, members: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.organization.count({ where }),
  ]);

  return successResponse({
    items: orgs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

/** POST /api/platform/organizations — create a new org (org code auto-generated) */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const caller = await requireKingdomAdmin(req);

  const body = await req.json();
  const { name, organizationType, description, website, phone, address } = body;

  if (!name || typeof name !== "string" || !name.trim())
    throw new ValidationError("name is required");

  if (
    organizationType !== undefined &&
    !Object.values(OrganizationType).includes(organizationType)
  )
    throw new ValidationError(
      `organizationType must be one of: ${Object.values(OrganizationType).join(", ")}`,
    );

  // createOrganization auto-generates the org code
  const org = await createOrganization(
    {
      name: name.trim(),
      organizationType: organizationType ?? OrganizationType.CHURCH,
      description,
      website,
      phone,
      address,
    },
    caller.id, // org creator = KINGDOM_SUPER_ADMIN
  );

  return successResponse(org);
});
