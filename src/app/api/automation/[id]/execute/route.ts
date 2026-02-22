import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { executeRule } from "@/services/automation.service";

type RouteParams = { params: Promise<{ id: string }> };

export const POST = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    await getRequestUser(req);
    const body = await req.json().catch(() => ({}));
    const log = await executeRule(id, body?.triggerData);
    return successResponse(log);
  },
);
