/**
 * GET  /api/auth/profile  — Returns the authenticated user's profile.
 * PATCH /api/auth/profile  — Updates firstName, lastName, phone.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate } from "@/lib/validate";
import { getRequestUser } from "@/lib/request";
import { prisma } from "@/lib/prisma";

export { GET } from "@/app/api/auth/me/route";

const patchSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).optional(),
});

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const user = await getRequestUser(req);
  const data = validate(patchSchema, await req.json());

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
    },
  });

  return successResponse(updated);
});
