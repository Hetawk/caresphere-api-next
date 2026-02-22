import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { getDashboardMetrics } from "@/services/analytics.service";
import { getUserOrganization } from "@/services/organization.service";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const org = await getUserOrganization(currentUser.id);
  const metrics = await getDashboardMetrics(org?.id);
  return successResponse(metrics);
});
