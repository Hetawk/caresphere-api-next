import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import {
  verifyRegistrationCode,
  completeRegistration,
  issueTokens,
} from "@/services/auth.service";
import {
  createOrganization,
  joinOrganization,
} from "@/services/organization.service";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
  phone: z.string().optional(),
  organizationAction: z.enum(["create", "join"]),
  organizationName: z.string().optional(),
  organizationCode: z.string().optional(),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.message);

  const {
    organizationAction,
    organizationName,
    organizationCode,
    ...userData
  } = parsed.data;

  await verifyRegistrationCode(userData.email, userData.code);
  const user = await completeRegistration(userData);

  let organization;
  if (organizationAction === "create") {
    if (!organizationName)
      throw new ValidationError(
        "organizationName required when creating an org",
      );
    organization = await createOrganization(
      { name: organizationName },
      user.id,
    );
  } else {
    if (!organizationCode)
      throw new ValidationError(
        "organizationCode required when joining an org",
      );
    organization = await joinOrganization(organizationCode, user.id);
  }

  const tokens = await issueTokens(user);

  return successResponse({ user, organization, ...tokens }, { status: 201 });
});
