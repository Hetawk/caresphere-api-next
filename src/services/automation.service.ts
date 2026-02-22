/**
 * Automation service — rule CRUD, execution, logs.
 * TypeScript port of caresphere-api/app/services/automation_service.py
 */

import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { Prisma } from "@prisma/client";
import { toPrismaPage } from "@/lib/pagination";
import { config } from "@/lib/config";

export async function listRules(opts: {
  page: number;
  limit: number;
  isActive?: boolean;
}) {
  const where: Prisma.AutomationRuleWhereInput = {};
  if (opts.isActive !== undefined) where.isActive = opts.isActive;

  const [items, total] = await prisma.$transaction([
    prisma.automationRule.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toPrismaPage(opts.page, opts.limit),
    }),
    prisma.automationRule.count({ where }),
  ]);

  return { items, total };
}

export async function getRule(id: string) {
  const rule = await prisma.automationRule.findUnique({ where: { id } });
  if (!rule) throw new NotFoundError("Automation rule");
  return rule;
}

export async function createRule(
  data: {
    name: string;
    description?: string;
    triggerType: string;
    triggerConfig?: Record<string, unknown>;
    actionType: string;
    actionConfig?: Record<string, unknown>;
    conditions?: Record<string, unknown>;
  },
  createdBy: string,
) {
  return prisma.automationRule.create({
    data: {
      ...data,
      triggerConfig: (data.triggerConfig ?? {}) as Prisma.InputJsonValue,
      actionConfig: (data.actionConfig ?? {}) as Prisma.InputJsonValue,
      conditions: (data.conditions ?? {}) as Prisma.InputJsonValue,
      createdBy,
    },
  });
}

export async function updateRule(
  id: string,
  data: {
    name?: string;
    description?: string;
    triggerConfig?: Record<string, unknown>;
    actionConfig?: Record<string, unknown>;
    conditions?: Record<string, unknown>;
    isActive?: boolean;
  },
) {
  await getRule(id);
  return prisma.automationRule.update({
    where: { id },
    data: {
      ...data,
      triggerConfig: data.triggerConfig as Prisma.InputJsonValue | undefined,
      actionConfig: data.actionConfig as Prisma.InputJsonValue | undefined,
      conditions: data.conditions as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function deleteRule(id: string) {
  await getRule(id);
  return prisma.automationRule.delete({ where: { id } });
}

export async function executeRule(
  id: string,
  triggerData?: Record<string, unknown>,
) {
  const rule = await getRule(id);
  if (!rule.isActive) {
    throw new Error("Cannot execute an inactive automation rule");
  }

  if (!config.FEATURE_AUTOMATION) {
    throw new Error("Automation feature is disabled");
  }

  const startedAt = Date.now();
  let status = "success";
  let errorMessage: string | undefined;
  let actionResult: Record<string, unknown> = {};

  try {
    // Placeholder execution logic — extend for real action types
    actionResult = {
      executed: true,
      actionType: rule.actionType,
      timestamp: new Date(),
    };

    await prisma.automationRule.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        runCount: { increment: 1 },
        successCount: { increment: 1 },
      },
    });
  } catch (err) {
    status = "failure";
    errorMessage = err instanceof Error ? err.message : String(err);
    await prisma.automationRule.update({
      where: { id },
      data: { failureCount: { increment: 1 } },
    });
  }

  return prisma.automationLog.create({
    data: {
      ruleId: id,
      status,
      triggerData: (triggerData ?? {}) as Prisma.InputJsonValue,
      actionResult: actionResult as Prisma.InputJsonValue,
      errorMessage,
      executionTimeMs: Date.now() - startedAt,
      executedAt: new Date(),
    },
  });
}

export async function listLogs(opts: { ruleId?: string; limit: number }) {
  return prisma.automationLog.findMany({
    where: opts.ruleId ? { ruleId: opts.ruleId } : {},
    orderBy: { createdAt: "desc" },
    take: opts.limit,
  });
}
