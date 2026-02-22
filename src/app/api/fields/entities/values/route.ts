import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate } from "@/lib/validate";
import { getRequestUser } from "@/lib/request";
import { updateEntityFieldValues } from "@/services/field-config.service";
import { EntityType } from "@prisma/client";

const schema = z.object({
  entityType: z.nativeEnum(EntityType),
  entityId: z.string().min(1, "entityId is required"),
  values: z.record(z.string(), z.union([z.string(), z.null()])),
});

/** POST /api/fields/entities/values — Bulk-upsert field values for an entity */
export const POST = withErrorHandling(async (req: NextRequest) => {
  await getRequestUser(req);
  const { entityType, entityId, values } = validate(schema, await req.json());
  const results = await updateEntityFieldValues(entityType, entityId, values);
  return successResponse(results);
});
