/**
 * GET /api/messages/dispatch
 *
 * Cron endpoint — runs every minute via Vercel Cron.
 * Dispatches all SCHEDULED messages whose scheduledFor time has passed.
 *
 * Protected by CRON_SECRET (set as a Vercel environment variable).
 * Vercel sends the secret as:  Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest } from "next/server";
import { sendScheduledMessages } from "@/services/message.service";
import { successResponse } from "@/lib/responses";

export const GET = async (req: NextRequest) => {
  // Verify the request comes from Vercel's cron scheduler.
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;

  if (expected && authHeader !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  const dispatched = await sendScheduledMessages();
  return successResponse({ dispatched });
};
