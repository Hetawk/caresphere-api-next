import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import {
  validate,
  emailSchema,
  passwordSchema,
  verifyCodeSchema,
} from "@/lib/validate";
import {
  verifyRegistrationCode,
  completeRegistration,
  issueTokens,
} from "@/services/auth.service";

const schema = z.object({
  email: emailSchema,
  code: verifyCodeSchema,
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: passwordSchema,
  phone: z.string().optional(),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const data = validate(schema, await req.json());
  await verifyRegistrationCode(data.email, data.code);
  const user = await completeRegistration(data);
  const tokens = await issueTokens(user);
  return successResponse({ user, ...tokens }, { status: 201 });
});
