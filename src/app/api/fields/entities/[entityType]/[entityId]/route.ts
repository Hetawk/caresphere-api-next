import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { getRequestUser } from "@/lib/request";
import {
  getEntityFields,
  updateEntityFieldValues,
} from "@/services/field-config.service";
import { EntityType } from "@prisma/client";

type RouteParams = {
  params: Promise<{ entityType: string; entityId: string }>;
};

export const GET = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { entityType, entityId } = await ctx.params;
    await getRequestUser(req);
    const fields = await getEntityFields(entityType as EntityType, entityId);
    return successResponse(fields);
  },
);

export const PUT = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { entityType, entityId } = await ctx.params;
    await getRequestUser(req);
    const body = await req.json();

    if (typeof body !== "object" || body === null) {
      throw new ValidationError("Expected a JSON object of fieldId → value");
    }

    const results = await updateEntityFieldValues(
      entityType as EntityType,
      entityId,
      body as Record<string, string | null>,
    );
    return successResponse(results);
  },
);
