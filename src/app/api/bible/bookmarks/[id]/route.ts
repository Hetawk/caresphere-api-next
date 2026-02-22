/**
 * DELETE /api/bible/bookmarks/[id]
 * Remove a saved Bible bookmark. Only the owner can delete their own bookmarks.
 */

import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { deleteBookmark } from "@/services/bible.service";

export const DELETE = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await getRequestUser(req);
    const { id } = await params;
    await deleteBookmark(currentUser.id, id);
    return successResponse(null);
  },
);
