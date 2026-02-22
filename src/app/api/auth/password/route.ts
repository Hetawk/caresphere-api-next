import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate, passwordSchema } from "@/lib/validate";
import { getRequestUser } from "@/lib/request";
import { changePassword } from "@/services/auth.service";

const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

/** PATCH /api/auth/password — Change the authenticated user's password */
export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const { currentPassword, newPassword } = validate(schema, await req.json());
  await changePassword(currentUser.id, currentPassword, newPassword);
  return successResponse({ message: "Password changed successfully" });
});
