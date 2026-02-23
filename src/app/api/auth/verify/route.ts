import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate, emailSchema } from "@/lib/validate";
import { generateRegistrationCode } from "@/services/auth.service";
import { transactionalEmail } from "@/services/email/transactional.service";

const schema = z.object({ email: emailSchema });

/** POST /api/auth/verify — Send a 6-digit verification code to the given email */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const { email } = validate(schema, await req.json());
  const code = await generateRegistrationCode(email);
  await transactionalEmail.sendVerificationCodeEmail(email, email, code, 15);
  return successResponse({ message: "Verification code sent" });
});
