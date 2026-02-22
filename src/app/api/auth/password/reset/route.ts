import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate, emailSchema, passwordSchema } from "@/lib/validate";
import { resetPasswordWithToken } from "@/services/auth.service";

const schema = z.object({
  email: emailSchema,
  token: z.string().min(1, "Reset token is required"),
  newPassword: passwordSchema,
});

/** POST /api/auth/password/reset — Reset password using token from email */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const { email, token, newPassword } = validate(schema, await req.json());
  await resetPasswordWithToken(email, token, newPassword);
  return successResponse({ message: "Password reset successfully" });
});
