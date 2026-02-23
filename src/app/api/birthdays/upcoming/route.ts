import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { getUserOrganization } from "@/services/organization.service";
import { getUpcomingBirthdays } from "@/services/birthday.service";

/**
 * GET /api/birthdays/upcoming?days=30
 * Returns members with birthdays in the next `days` days.
 * Authenticated — any member of the org can see upcoming birthdays.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const org = await getUserOrganization(currentUser.id);
  if (!org) {
    return successResponse({ today: [], upcoming: [], total: 0 });
  }

  const days = Math.min(
    parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10) || 30,
    365,
  );

  const result = await getUpcomingBirthdays(org.id, days);
  return successResponse(result);
});
