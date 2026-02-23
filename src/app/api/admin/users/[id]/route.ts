import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { NotFoundError, AuthorizationError } from "@/lib/errors";
import { requireRoles } from "@/lib/request";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { UserRole, UserStatus } from "@prisma/client";
import { validate } from "@/lib/validate";

const updateSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  password: z.string().min(8).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

/** Shared guard: actor must be in same org, target must not be KINGDOM_SUPER_ADMIN */
async function resolveTarget(
  actorId: string,
  actorOrgId: string | null,
  targetId: string,
) {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new NotFoundError("User");

  // KINGDOM_SUPER_ADMIN accounts are never touchable by org-level admins
  if (target.role === UserRole.KINGDOM_SUPER_ADMIN)
    throw new AuthorizationError("This account cannot be modified.");

  // Target must belong to the same organisation
  if (target.organizationId !== actorOrgId)
    throw new AuthorizationError(
      "You can only manage users within your organisation.",
    );

  return target;
}

export const PUT = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    const actor = await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);

    await resolveTarget(actor.id, actor.organizationId ?? null, id);

    const { password, role, ...rest } = validate(
      updateSchema,
      await req.json(),
    );

    // Prevent escalating anyone to KINGDOM_SUPER_ADMIN
    if (role === UserRole.KINGDOM_SUPER_ADMIN)
      throw new AuthorizationError("Cannot assign KINGDOM_SUPER_ADMIN role.");

    // ADMIN cannot promote to SUPER_ADMIN
    if (actor.role === UserRole.ADMIN && role === UserRole.SUPER_ADMIN)
      throw new AuthorizationError(
        "ADMINs cannot assign the SUPER_ADMIN role.",
      );

    const updates: Record<string, unknown> = { ...rest };
    if (role) updates.role = role;
    if (password) updates.passwordHash = await hashPassword(password);

    const updated = await prisma.user.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    return successResponse(updated);
  },
);

// PATCH is an alias for PUT — both HTTP verbs are supported
export const PATCH = PUT;

export const DELETE = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    const actor = await requireRoles(req, UserRole.SUPER_ADMIN);

    await resolveTarget(actor.id, actor.organizationId ?? null, id);

    await prisma.user.delete({ where: { id } });

    return successResponse({ message: "User deleted permanently." });
  },
);
