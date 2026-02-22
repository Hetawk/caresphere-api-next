import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate, emailSchema, verifyCodeSchema } from "@/lib/validate";
import { verifyRegistrationCode } from "@/services/auth.service";

const schema = z.object({ email: emailSchema, code: verifyCodeSchema });

/** POST /api/auth/verify-email — Verify a 6-digit registration code */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const { email, code } = validate(schema, await req.json());
  await verifyRegistrationCode(email, code);
  return successResponse({ message: "Email verified successfully" });
});
