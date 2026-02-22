import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { getRequestUser } from "@/lib/request";
import { parsePaginationParams, paginationMeta } from "@/lib/pagination";
import { listMembers, createMember } from "@/services/member.service";
import { getUserOrganization } from "@/services/organization.service";
import { MemberStatus } from "@prisma/client";

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "ORGANIZATION"]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  memberStatus: z.nativeEnum(MemberStatus).optional(),
  membershipType: z.string().optional(),
  joinDate: z.string().optional(),
  photoUrl: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  workSchool: z.string().optional(),
  whatsappNumber: z.string().optional(),
  wechatId: z.string().optional(),
  hearAboutUs: z.string().optional(),
  involvement: z.string().optional(),
  comments: z.string().optional(),
  consentGiven: z.boolean().optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const org = await getUserOrganization(currentUser.id);
  const { page, limit } = parsePaginationParams(req.nextUrl.searchParams);
  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const statusParam = req.nextUrl.searchParams.get(
    "status",
  ) as MemberStatus | null;

  const { items, total } = await listMembers({
    page,
    limit,
    status: statusParam ?? undefined,
    search,
    organizationId: org?.id,
  });

  return successResponse(items, {
    metadata: paginationMeta(total, page, limit),
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const org = await getUserOrganization(currentUser.id);
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.message);

  const member = await createMember(parsed.data, org?.id);
  return successResponse(member, { status: 201 });
});
