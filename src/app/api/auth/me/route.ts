import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const {
    id,
    email,
    firstName,
    lastName,
    phone,
    role,
    status,
    createdAt,
    lastLoginAt,
  } = await getRequestUser(req);

  return successResponse({
    id,
    email,
    firstName,
    lastName,
    phone,
    role,
    status,
    createdAt,
    lastLoginAt,
  });
});
