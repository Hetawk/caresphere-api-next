import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { NotFoundError } from "@/lib/errors";
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

export const PUT = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError("User");

    const { password, ...rest } = validate(updateSchema, await req.json());
    const updates: Record<string, unknown> = { ...rest };
    if (password) {
      updates.passwordHash = await hashPassword(password);
    }

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
