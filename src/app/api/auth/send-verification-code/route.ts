import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { generateRegistrationCode } from "@/services/auth.service";

const schema = z.object({ email: z.string().email() });

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.message);

  await generateRegistrationCode(parsed.data.email);
  return successResponse(
    { message: "Verification code sent" },
    { status: 200 },
  );
});
