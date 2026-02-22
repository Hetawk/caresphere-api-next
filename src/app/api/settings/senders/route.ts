import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { requireRoles } from "@/lib/request";
import {
  getSenderSetting,
  createOrUpdateSenderSetting,
  deleteSenderSetting,
} from "@/services/settings.service";
import { SettingScope, UserRole } from "@prisma/client";

const upsertSchema = z.object({
  scope: z.nativeEnum(SettingScope),
  referenceId: z.string().optional(),
  senderName: z.string().optional(),
  senderEmail: z.string().email().optional(),
  senderPhone: z.string().optional(),
  organizationId: z.string().optional(),
});

const deleteSchema = z.object({
  scope: z.nativeEnum(SettingScope),
  referenceId: z.string().optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);
  const sp = req.nextUrl.searchParams;
  const scope = sp.get("scope") as SettingScope | null;
  const referenceId = sp.get("referenceId") ?? undefined;

  const setting = await getSenderSetting(
    scope ?? SettingScope.GLOBAL,
    referenceId,
  );
  return successResponse(setting ?? null);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);
  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.message);

  const { scope, referenceId, ...data } = parsed.data;
  const setting = await createOrUpdateSenderSetting(scope, referenceId, data);
  return successResponse(setting);
});

export const DELETE = withErrorHandling(async (req: NextRequest) => {
  await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);
  const body = await req.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.message);

  await deleteSenderSetting(parsed.data.scope, parsed.data.referenceId);
  return successResponse({ message: "Setting deleted" });
});
