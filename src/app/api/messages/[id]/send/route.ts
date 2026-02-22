import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { sendMessage } from "@/services/message.service";

type RouteParams = { params: Promise<{ id: string }> };

export const POST = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    await getRequestUser(req);
    const result = await sendMessage(id);
    return successResponse(result);
  },
);
