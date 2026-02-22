import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate } from "@/lib/validate";
import { getRequestUser } from "@/lib/request";
import { parsePaginationParams, paginationMeta } from "@/lib/pagination";
import { listRules, createRule } from "@/services/automation.service";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  triggerType: z.string().min(1, "Trigger type is required"),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  actionType: z.string().min(1, "Action type is required"),
  actionConfig: z.record(z.string(), z.unknown()).optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  await getRequestUser(req);
  const sp = req.nextUrl.searchParams;
  const { page, limit } = parsePaginationParams(sp);
  const isActiveParam = sp.get("isActive");
  const isActive =
    isActiveParam !== null ? isActiveParam === "true" : undefined;

  const { items, total } = await listRules({ page, limit, isActive });
  return successResponse(items, {
    metadata: paginationMeta(total, page, limit),
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const body = validate(createSchema, await req.json());
  const rule = await createRule(body, currentUser.id);
  return successResponse(rule, { status: 201 });
});
