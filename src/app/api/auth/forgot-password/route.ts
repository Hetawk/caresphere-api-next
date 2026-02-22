import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { initiatePasswordReset } from "@/services/auth.service";
import { transactionalEmail } from "@/services/email/transactional.service";

const schema = z.object({ email: z.string().email() });

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.message);

  const { user, token } = await initiatePasswordReset(parsed.data.email);
  await transactionalEmail.sendPasswordResetEmail(
    user.email,
    user.firstName,
    token,
  );

  return successResponse({
    message: "Password reset instructions sent to your email",
  });
});
