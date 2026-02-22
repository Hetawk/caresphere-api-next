import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { authenticateUser, issueTokens } from "@/services/auth.service";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.message);

  const user = await authenticateUser(parsed.data.email, parsed.data.password);
  const tokens = await issueTokens(user);

  return successResponse({ user, ...tokens });
});
