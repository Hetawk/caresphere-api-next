import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate } from "@/lib/validate";
import { getRequestUser } from "@/lib/request";
import { parsePaginationParams, paginationMeta } from "@/lib/pagination";
import { listRules, createRule } from "@/services/automation.service";

const createSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    triggerType: z.string().min(1, "Trigger type is required"),
    triggerConfig: z.record(z.string(), z.unknown()).optional(),
    actionType: z.string().min(1, "Action type is required"),
    actionConfig: z.record(z.string(), z.unknown()).optional(),
    conditions: z.record(z.string(), z.unknown()).optional(),
  })
  .partial({
    triggerType: true,
    actionType: true,
    triggerConfig: true,
    actionConfig: true,
    conditions: true,
  })
  .extend({
    trigger: z.string().optional(),
    action: z.string().optional(),
    templateId: z.string().optional(),
    delayDays: z.number().optional(),
    bibleReference: z.string().optional(),
    translationId: z.string().optional(),
  });

function normalizeRulePayload(body: z.infer<typeof createSchema>) {
  const triggerType = body.triggerType ?? body.trigger ?? "custom";
  const actionType = body.actionType ?? body.action ?? "send_email";

  const triggerConfig = {
    ...(body.triggerConfig ?? {}),
    ...(body.delayDays !== undefined ? { delayDays: body.delayDays } : {}),
  };

  const actionConfig = {
    ...(body.actionConfig ?? {}),
    ...(body.templateId ? { templateId: body.templateId } : {}),
    ...(body.bibleReference ? { bibleReference: body.bibleReference } : {}),
    ...(body.translationId ? { translationId: body.translationId } : {}),
  };

  return {
    name: body.name,
    description: body.description,
    triggerType,
    triggerConfig,
    actionType,
    actionConfig,
    conditions: body.conditions ?? {},
  };
}

function toUiRule(rule: {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: unknown;
  actionType: string;
  actionConfig: unknown;
  isActive: boolean;
  createdAt: Date;
  lastRunAt: Date | null;
}) {
  const triggerCfg = (rule.triggerConfig ?? {}) as Record<string, unknown>;
  const actionCfg = (rule.actionConfig ?? {}) as Record<string, unknown>;
  return {
    ...rule,
    trigger: rule.triggerType,
    action: rule.actionType,
    delayDays: Number(triggerCfg.delayDays ?? 0),
    templateId: actionCfg.templateId as string | undefined,
  };
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  await getRequestUser(req);
  const sp = req.nextUrl.searchParams;
  const { page, limit } = parsePaginationParams(sp);
  const isActiveParam = sp.get("isActive");
  const isActive =
    isActiveParam !== null ? isActiveParam === "true" : undefined;

  const { items, total } = await listRules({ page, limit, isActive });
  return successResponse(items.map(toUiRule), {
    metadata: paginationMeta(total, page, limit),
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const body = validate(createSchema, await req.json());
  const rule = await createRule(normalizeRulePayload(body), currentUser.id);
  return successResponse(toUiRule(rule), { status: 201 });
});
