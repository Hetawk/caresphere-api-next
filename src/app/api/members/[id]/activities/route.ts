import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { getRequestUser } from "@/lib/request";
import { listActivities, logActivity } from "@/services/member.service";

const createSchema = z.object({
  activityType: z.string().min(1),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    const activities = await listActivities(id);
    return successResponse(activities);
  },
);

export const POST = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    const currentUser = await getRequestUser(req);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const activity = await logActivity(id, parsed.data.activityType, {
      description: parsed.data.description,
      metadata: parsed.data.metadata as Record<string, unknown> | undefined,
      performedBy: currentUser.id,
    });
    return successResponse(activity, { status: 201 });
  },
);
