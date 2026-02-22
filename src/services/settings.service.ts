/**
 * Settings service — sender settings with resolution hierarchy.
 * Mirrors caresphere-api/app/api/settings.py (settings_service logic).
 *
 * Resolution order: user-level > org-level > global > env
 *
 * DB schema mapping:
 *   scopeId      → referenceId
 *   senderId     → (stored in env config, no DB column)
 *   defaultFrom  → senderEmail
 *   defaultFromName → senderName
 *   smsFrom      → senderPhone
 *   voiceFrom    → (stored in env config, no DB column)
 */

import { prisma } from "@/lib/prisma";
import { SettingScope } from "@prisma/client";
import { config } from "@/lib/config";

// ---- types ---------------------------------------------------------------

export interface ResolvedSenderSettings {
  senderId: string;
  defaultFrom: string;
  defaultFromName: string;
  smsFrom: string;
  voiceFrom: string;
  resolvedScope: "user" | "organization" | "global" | "env";
}

// ---- helpers --------------------------------------------------------------

function buildWhere(scope: SettingScope, referenceId?: string) {
  return { scope, referenceId: referenceId ?? null };
}

// ---- CRUD -----------------------------------------------------------------

export async function getSenderSetting(
  scope: SettingScope,
  referenceId?: string,
) {
  return prisma.senderSetting.findFirst({
    where: buildWhere(scope, referenceId),
  });
}

export async function createOrUpdateSenderSetting(
  scope: SettingScope,
  referenceId: string | undefined,
  data: {
    senderName?: string;
    senderEmail?: string;
    senderPhone?: string;
    organizationId?: string;
  },
) {
  const where = buildWhere(scope, referenceId);
  const existing = await prisma.senderSetting.findFirst({ where });

  if (existing) {
    return prisma.senderSetting.update({ where: { id: existing.id }, data });
  }

  return prisma.senderSetting.create({
    data: { ...data, scope, referenceId: referenceId ?? null },
  });
}

export async function deleteSenderSetting(
  scope: SettingScope,
  referenceId?: string,
) {
  const existing = await prisma.senderSetting.findFirst({
    where: buildWhere(scope, referenceId),
  });
  if (existing) {
    return prisma.senderSetting.delete({ where: { id: existing.id } });
  }
  return null;
}

// ---- Resolution -----------------------------------------------------------

/**
 * Resolve the most specific sender settings for a given user + org context.
 * Hierarchy: user-level > org-level > global > env
 */
export async function getResolvedSenderSettings(
  userId?: string,
  orgId?: string,
): Promise<ResolvedSenderSettings> {
  let setting = null;
  let resolvedScope: ResolvedSenderSettings["resolvedScope"] = "env";

  if (userId) {
    setting = await prisma.senderSetting.findFirst({
      where: { scope: SettingScope.USER, referenceId: userId },
    });
    if (setting) resolvedScope = "user";
  }

  if (!setting && orgId) {
    setting = await prisma.senderSetting.findFirst({
      where: { scope: SettingScope.ORGANIZATION, referenceId: orgId },
    });
    if (setting) resolvedScope = "organization";
  }

  if (!setting) {
    setting = await prisma.senderSetting.findFirst({
      where: { scope: SettingScope.GLOBAL, referenceId: null },
    });
    if (setting) resolvedScope = "global";
  }

  return {
    senderId: config.SENDER_ID,
    defaultFrom: setting?.senderEmail ?? config.DEFAULT_FROM_EMAIL,
    defaultFromName: setting?.senderName ?? config.DEFAULT_FROM_NAME,
    smsFrom: setting?.senderPhone ?? config.DEFAULT_SMS_FROM,
    voiceFrom: config.DEFAULT_VOICE_FROM,
    resolvedScope,
  };
}
