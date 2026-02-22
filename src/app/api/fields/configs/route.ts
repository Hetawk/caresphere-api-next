import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { requireRoles, getRequestUser } from "@/lib/request";
import {
  listFieldConfigurations,
  createFieldConfiguration,
} from "@/services/field-config.service";
import { EntityType, FieldType, UserRole } from "@prisma/client";

const createSchema = z.object({
  fieldKey: z.string().min(1),
  fieldLabel: z.string().min(1),
  fieldType: z.nativeEnum(FieldType).optional(),
  entityType: z.nativeEnum(EntityType),
  isRequired: z.boolean().optional(),
  defaultValue: z.string().optional(),
  options: z.array(z.string()).optional(),
  displayOrder: z.number().int().optional(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);
  const entityType = req.nextUrl.searchParams.get(
    "entityType",
  ) as EntityType | null;
  const configs = await listFieldConfigurations(entityType ?? undefined);
  return successResponse(configs);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await requireRoles(
    req,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
  );
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.message);

  const organizationId = currentUser.organizationId ?? body.organizationId;
  if (!organizationId) throw new ValidationError("organizationId is required");

  const config = await createFieldConfiguration({
    ...parsed.data,
    organizationId,
  });
  return successResponse(config, { status: 201 });
});
