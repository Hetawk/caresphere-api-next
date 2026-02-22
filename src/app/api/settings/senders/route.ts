import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate } from "@/lib/validate";
import { getRequestUser, requireRoles } from "@/lib/request";
import {
  getSenderSetting,
  createOrUpdateSenderSetting,
  deleteSenderSetting,
  getResolvedSenderSettings,
} from "@/services/settings.service";
import { SettingScope, UserRole } from "@prisma/client";
import { getUserOrganization } from "@/services/organization.service";

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

/**
 * GET /api/settings/senders            — Admin: get raw sender setting by scope/referenceId
 * GET /api/settings/senders?resolved=1 — Any auth user: get effective (resolved) sender settings
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;

  // ?resolved=true  → return the effective sender settings for the current user
  if (sp.get("resolved") === "true" || sp.get("resolved") === "1") {
    const currentUser = await getRequestUser(req);
    const org = await getUserOrganization(currentUser.id);
    const resolved = await getResolvedSenderSettings(currentUser.id, org?.id);
    return successResponse(resolved);
  }

  // Default: admin-only raw lookup
  await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);
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
  const { scope, referenceId, ...data } = validate(
    upsertSchema,
    await req.json(),
  );
  const setting = await createOrUpdateSenderSetting(scope, referenceId, data);
  return successResponse(setting);
});

export const DELETE = withErrorHandling(async (req: NextRequest) => {
  await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);
  const { scope, referenceId } = validate(deleteSchema, await req.json());
  await deleteSenderSetting(scope, referenceId);
  return successResponse({ message: "Setting deleted" });
});
