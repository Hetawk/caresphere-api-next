import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueTokens } from "@/services/auth.service";
import { z } from "zod";

const schema = z.object({ refreshToken: z.string().min(1) });

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.message);

  const payload = verifyToken(parsed.data.refreshToken);
  if (payload.type !== "refresh")
    throw new AuthenticationError("Invalid refresh token");

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status !== "ACTIVE")
    throw new AuthenticationError("User not found or inactive");

  return successResponse(issueTokens(user));
});
