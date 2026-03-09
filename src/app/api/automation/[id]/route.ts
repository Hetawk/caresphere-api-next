import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate } from "@/lib/validate";
import { getRequestUser } from "@/lib/request";
import { getRule, updateRule, deleteRule } from "@/services/automation.service";

const updateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  triggerType: z.string().optional(),
  actionType: z.string().optional(),
  trigger: z.string().optional(),
  action: z.string().optional(),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  actionConfig: z.record(z.string(), z.unknown()).optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
  templateId: z.string().optional(),
  delayDays: z.number().optional(),
  bibleReference: z.string().optional(),
  translationId: z.string().optional(),
  isActive: z.boolean().optional(),
});

function normalizeUpdatePayload(body: z.infer<typeof updateSchema>) {
  const triggerType = body.triggerType ?? body.trigger;
  const actionType = body.actionType ?? body.action;

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
    actionType,
    triggerConfig,
    actionConfig,
    conditions: body.conditions,
    isActive: body.isActive,
  };
}

type RouteParams = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    const rule = await getRule(id);
    return successResponse(rule);
  },
);

export const PUT = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    await getRequestUser(req);
    const body = validate(updateSchema, await req.json());
    const rule = await updateRule(id, normalizeUpdatePayload(body));
    return successResponse(rule);
  },
);

export const PATCH = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    await getRequestUser(req);
    const body = validate(updateSchema, await req.json());
    const rule = await updateRule(id, normalizeUpdatePayload(body));
    return successResponse(rule);
  },
);

export const DELETE = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    await getRequestUser(req);
    await deleteRule(id);
    return successResponse({ message: "Automation rule deleted" });
  },
);
