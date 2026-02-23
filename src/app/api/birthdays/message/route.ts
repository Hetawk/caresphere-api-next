import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate } from "@/lib/validate";
import { getRequestUser } from "@/lib/request";
import { getUserOrganization } from "@/services/organization.service";
import { generateBirthdayMessage } from "@/services/birthday.service";
import { OrganizationType } from "@prisma/client";

const schema = z.object({
  recipientName: z.string().min(1),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]).default("EMAIL"),
  age: z.number().int().positive().optional(),
});

/**
 * POST /api/birthdays/message
 * Generates an org-type-aware birthday message for a member.
 * Used by the app's compose flow when picking a birthday template.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const org = await getUserOrganization(currentUser.id);

  const body = await req.json();
  const data = validate(schema, body);

  const msg = generateBirthdayMessage({
    recipientName: data.recipientName,
    senderName: org?.name ?? "CareSphere",
    organizationType: (org?.organizationType ?? "OTHER") as OrganizationType,
    channel: data.channel,
    age: data.age,
  });

  return successResponse(msg);
});
