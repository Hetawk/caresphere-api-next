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
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  actionConfig: z.record(z.string(), z.unknown()).optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

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
    const rule = await updateRule(id, body);
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
