import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { listLogs } from "@/services/automation.service";
import { config } from "@/lib/config";

export const GET = withErrorHandling(async (req: NextRequest) => {
  await getRequestUser(req);
  const sp = req.nextUrl.searchParams;
  const ruleId = sp.get("ruleId") ?? undefined;
  const limitParam = sp.get("limit");
  const limit = limitParam
    ? Math.min(parseInt(limitParam, 10), config.LOG_LIMIT_MAX)
    : config.LOG_LIMIT_DEFAULT;

  const logs = await listLogs({ ruleId, limit });
  return successResponse(logs);
});
