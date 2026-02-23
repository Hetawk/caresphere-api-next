import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import {
  validate,
  emailSchema,
  passwordSchema,
  verifyCodeSchema,
  orgCodeSchema,
} from "@/lib/validate";
import {
  completeRegistration,
  issueTokens,
} from "@/services/auth.service";
import {
  createOrganization,
  joinOrganization,
} from "@/services/organization.service";
import { ValidationError } from "@/lib/errors";

const schema = z.object({
  email: emailSchema,
  code: verifyCodeSchema,
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: passwordSchema,
  phone: z.string().optional(),
  organizationAction: z.enum(["create", "join"]),
  organizationName: z.string().optional(),
  organizationCode: orgCodeSchema.optional(),
});

/** POST /api/auth/register-org — Register a new user and create or join an org */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const {
    organizationAction,
    organizationName,
    organizationCode,
    ...userData
  } = validate(schema, await req.json());

  // Validate org inputs BEFORE touching the OTP / user records so that any
  // missing field returns a clean 400 without consuming the verification code.
  if (organizationAction === "create" && !organizationName) {
    throw new ValidationError(
      "organizationName: required when creating an org",
    );
  }
  if (organizationAction === "join" && !organizationCode) {
    throw new ValidationError(
      "organizationCode: required when joining an org",
    );
  }

  const user = await completeRegistration(userData);

  let organization;
  if (organizationAction === "create") {
    organization = await createOrganization(
      { name: organizationName! },
      user.id,
    );
  } else {
    organization = await joinOrganization(organizationCode!, user.id);
  }

  const tokens = await issueTokens(user);
  return successResponse({ user, organization, ...tokens }, { status: 201 });
});
