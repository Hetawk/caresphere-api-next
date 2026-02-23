import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { getUserAllOrganizations } from "@/services/organization.service";

/** GET /api/orgs/all — List every organisation the current user belongs to */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const orgs = await getUserAllOrganizations(currentUser.id);
  return successResponse(orgs);
});
