import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate, emailSchema } from "@/lib/validate";
import { authenticateUser, issueTokens } from "@/services/auth.service";

const schema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { email, password } = validate(schema, await req.json());
  const user = await authenticateUser(email, password);
  const tokens = await issueTokens(user);
  return successResponse({ user, ...tokens });
});
