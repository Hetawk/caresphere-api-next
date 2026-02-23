import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { prisma } from "@/lib/prisma";
import {
  getUpcomingBirthdays,
  sendBirthdayAlertToLeader,
  generateBirthdayMessage,
  getOrgLeaders,
} from "@/services/birthday.service";
import { EkdSendService } from "@/services/email/email.service";
import { OrganizationType, MessageType, MessageStatus } from "@prisma/client";

/**
 * POST /api/birthdays/notify
 * Cron-triggered route (call from Vercel cron or any scheduler).
 * - Sends birthday emails/alerts to leaders for: 7-day, 3-day, today
 * - On birthday day: also sends the birthday message directly to the member
 *
 * Protect with a secret header in production:
 *   Authorization: Bearer <CRON_SECRET>
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  // Optional cron secret guard
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const emailService = new EkdSendService();
  const results: Array<{ orgId: string; orgName: string; processed: number }> =
    [];

  // Process every active organization
  const organizations = await prisma.organization.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      organizationType: true,
    },
  });

  for (const org of organizations) {
    const { today, upcoming } = await getUpcomingBirthdays(org.id, 7);
    const leaders = await getOrgLeaders(org.id);
    const validLeaders = leaders.filter((l) => l.email);

    // ── 1. Alert leaders for 7-day window (once a week check) ──────────────
    const in7Days = upcoming.filter((m) => m.daysUntil === 7);
    if (in7Days.length > 0 && validLeaders.length > 0) {
      for (const leader of validLeaders) {
        if (!leader.email) continue;
        await sendBirthdayAlertToLeader({
          leaderEmail: leader.email,
          leaderName: [leader.firstName, leader.lastName]
            .filter(Boolean)
            .join(" "),
          orgName: org.name,
          members: in7Days,
          daysAway: 7,
        });
      }
    }

    // ── 2. Alert leaders for 3-day window ───────────────────────────────────
    const in3Days = upcoming.filter((m) => m.daysUntil === 3);
    if (in3Days.length > 0 && validLeaders.length > 0) {
      for (const leader of validLeaders) {
        if (!leader.email) continue;
        await sendBirthdayAlertToLeader({
          leaderEmail: leader.email,
          leaderName: [leader.firstName, leader.lastName]
            .filter(Boolean)
            .join(" "),
          orgName: org.name,
          members: in3Days,
          daysAway: 3,
        });
      }
    }

    // ── 3. Today: alert leaders + send birthday message to member ────────────
    if (today.length > 0) {
      // Alert leaders about today's birthdays
      if (validLeaders.length > 0) {
        for (const leader of validLeaders) {
          if (!leader.email) continue;
          await sendBirthdayAlertToLeader({
            leaderEmail: leader.email,
            leaderName: [leader.firstName, leader.lastName]
              .filter(Boolean)
              .join(" "),
            orgName: org.name,
            members: today,
            daysAway: 0,
          });
        }
      }

      // Send birthday message directly to each member who has an email
      for (const member of today) {
        if (!member.email) continue;

        const msg = generateBirthdayMessage({
          recipientName: member.fullName,
          senderName: org.name,
          organizationType: org.organizationType as OrganizationType,
          channel: "EMAIL",
          age: member.age,
        });

        try {
          await emailService.sendEmail(member.email, msg.subject, msg.body);

          // Log sent message in DB (only if we have a leader to attribute it to)
          if (validLeaders[0]?.id) {
            await prisma.message.create({
              data: {
                title: msg.subject,
                content: msg.body,
                messageType: MessageType.EMAIL,
                status: MessageStatus.SENT,
                sentAt: new Date(),
                createdBy: validLeaders[0].id,
                recipients: {
                  create: {
                    memberId: member.id,
                    recipientEmail: member.email,
                    status: "SENT",
                    sentAt: new Date(),
                  },
                },
              },
            });
          }
        } catch (err) {
          console.error(`Birthday email failed for member ${member.id}:`, err);
        }
      }
    }

    results.push({
      orgId: org.id,
      orgName: org.name,
      processed: today.length + in3Days.length + in7Days.length,
    });
  }

  return successResponse({
    message: "Birthday notifications processed",
    organizations: results.length,
    results,
  });
});
