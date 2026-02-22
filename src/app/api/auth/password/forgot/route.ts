import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate, emailSchema } from "@/lib/validate";
import { initiatePasswordReset } from "@/services/auth.service";
import { transactionalEmail } from "@/services/email/transactional.service";

const schema = z.object({ email: emailSchema });

/** POST /api/auth/password/forgot — Initiate a password-reset flow */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const { email } = validate(schema, await req.json());
  const { user, token } = await initiatePasswordReset(email);
  await transactionalEmail.sendPasswordResetEmail(
    user.email,
    user.firstName,
    token,
  );
  return successResponse({
    message: "Password reset instructions sent to your email",
  });
});
