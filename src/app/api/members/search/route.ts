import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { paginationMeta, parsePaginationParams } from "@/lib/pagination";
import { searchMembers } from "@/services/member.service";
import { MemberStatus } from "@prisma/client";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const { page, limit } = parsePaginationParams(sp);
  const query = sp.get("q") ?? sp.get("query") ?? undefined;
  const status = sp.get("status") as MemberStatus | null;
  const tags = sp.getAll("tags");

  const { items, total } = await searchMembers({
    query,
    status: status ?? undefined,
    tags: tags.length ? tags : undefined,
    page,
    limit,
  });

  return successResponse(items, { metadata: paginationMeta(total, page, limit) });
});
