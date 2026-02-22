/**
 * DELETE /api/bible/highlights/[id]
 * Remove a Bible highlight. Only the owner can delete their own highlights.
 */

import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { deleteHighlight } from "@/services/bible.service";

export const DELETE = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await getRequestUser(req);
    const { id } = await params;
    await deleteHighlight(currentUser.id, id);
    return successResponse(null);
  },
);
