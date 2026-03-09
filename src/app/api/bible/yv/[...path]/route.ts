/**
 * YouVersion REST passthrough for diagnostics/integration parity.
 *
 * Route shape:
 *   /api/bible/yv/<youversion-v1-path>
 *
 * Examples:
 *   /api/bible/yv/bibles?language_ranges[]=en
 *   /api/bible/yv/bibles/3034/books
 *   /api/bible/yv/verse_of_the_days/69
 *
 * This route is intentionally generic so we can quickly test and adopt new
 * official endpoints without creating a new local route each time.
 */

import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { getRequestUser } from "@/lib/request";
import { config } from "@/lib/config";
import { ValidationError } from "@/lib/errors";

function getApiKey(): string {
  if (!config.YOUVERSION_API_KEY) {
    throw new ValidationError("YOUVERSION_API_KEY is not configured");
  }
  return config.YOUVERSION_API_KEY;
}

async function forward(
  req: NextRequest,
  path: string[],
  method: "GET" | "POST" | "DELETE",
) {
  await getRequestUser(req);

  if (!path.length) {
    throw new ValidationError("Missing YouVersion path segment");
  }

  const base = config.YOUVERSION_API_URL.replace(/\/$/, "");
  const upstream = new URL(`${base}/${path.join("/")}`);
  req.nextUrl.searchParams.forEach((value, key) => {
    upstream.searchParams.append(key, value);
  });

  const headers: Record<string, string> = {
    "X-YVP-App-Key": getApiKey(),
    Accept: "application/json",
  };

  const acceptLanguage = req.headers.get("accept-language");
  if (acceptLanguage) headers["Accept-Language"] = acceptLanguage;

  let body: string | undefined;
  if (method === "POST") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(await req.json());
  }

  const upstreamRes = await fetch(upstream.toString(), {
    method,
    headers,
    body,
    cache: "no-store",
  });

  if (upstreamRes.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const text = await upstreamRes.text();
  return new NextResponse(text, {
    status: upstreamRes.status,
    headers: {
      "Content-Type":
        upstreamRes.headers.get("content-type") ?? "application/json",
    },
  });
}

export const GET = withErrorHandling(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> },
  ) => {
    const { path } = await params;
    return forward(req, path, "GET");
  },
);

export const POST = withErrorHandling(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> },
  ) => {
    const { path } = await params;
    return forward(req, path, "POST");
  },
);

export const DELETE = withErrorHandling(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> },
  ) => {
    const { path } = await params;
    return forward(req, path, "DELETE");
  },
);
