import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { getRequestUser } from "@/lib/request";
import { parsePaginationParams, paginationMeta } from "@/lib/pagination";
import { listRules, createRule } from "@/services/automation.service";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggerType: z.string().min(1),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  actionType: z.string().min(1),
  actionConfig: z.record(z.string(), z.unknown()).optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  await getRequestUser(req);
  const sp = req.nextUrl.searchParams;
  const { page, limit } = parsePaginationParams(sp);
  const isActiveParam = sp.get("isActive");
  const isActive = isActiveParam !== null ? isActiveParam === "true" : undefined;

  const { items, total } = await listRules({ page, limit, isActive });
  return successResponse(items, { metadata: paginationMeta(total, page, limit) });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.message);

  const rule = await createRule(parsed.data, currentUser.id);
  return successResponse(rule, { status: 201 });
});
