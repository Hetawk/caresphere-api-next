/**
 * Pagination utilities.
 * Mirrors caresphere-api/app/utils/pagination.py
 */

import { config } from "@/lib/config";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  [key: string]: unknown;
}

export function paginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/** Convert page + limit to Prisma skip/take. */
export function toPrismaPage(page: number, limit: number) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

/** Parse & clamp pagination query params. */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
} {
  const page = Math.max(
    1,
    parseInt(searchParams.get("page") ?? String(config.PAGE_DEFAULT), 10),
  );
  const limit = Math.min(
    config.PAGE_SIZE_MAX,
    Math.max(
      1,
      parseInt(
        searchParams.get("limit") ?? String(config.PAGE_SIZE_DEFAULT),
        10,
      ),
    ),
  );
  return { page, limit };
}
