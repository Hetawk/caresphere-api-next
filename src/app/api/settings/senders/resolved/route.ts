import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { getResolvedSenderSettings } from "@/services/settings.service";
import { getUserOrganization } from "@/services/organization.service";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const org = await getUserOrganization(currentUser.id);
  const resolved = await getResolvedSenderSettings(currentUser.id, org?.id);
  return successResponse(resolved);
});
