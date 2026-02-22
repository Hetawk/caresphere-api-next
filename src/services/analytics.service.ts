/**
 * Analytics service — dashboard metrics.
 * TypeScript port of caresphere-api/app/services/analytics_service.py
 */

import { prisma } from "@/lib/prisma";
import { MemberStatus, MessageStatus } from "@prisma/client";

export async function getDashboardMetrics(organizationId?: string) {
  const memberWhere = organizationId ? { organizationId } : {};

  const [
    totalMembers,
    activeMembers,
    newMembersThisMonth,
    totalMessages,
    sentMessages,
    totalTemplates,
    totalAutomations,
    activeAutomations,
  ] = await prisma.$transaction([
    prisma.member.count({ where: memberWhere }),
    prisma.member.count({ where: { ...memberWhere, memberStatus: MemberStatus.ACTIVE } }),
    prisma.member.count({
      where: {
        ...memberWhere,
        createdAt: { gte: new Date(new Date().setDate(1)) },
      },
    }),
    prisma.message.count(),
    prisma.message.count({ where: { status: MessageStatus.SENT } }),
    prisma.template.count({ where: { isActive: true } }),
    prisma.automationRule.count(),
    prisma.automationRule.count({ where: { isActive: true } }),
  ]);

  // Member growth: last 6 months
  const memberGrowth = await getMemberGrowth(organizationId);

  // Message breakdown
  const messageBreakdown = await prisma.message.groupBy({
    by: ["messageType"],
    _count: { _all: true },
  });

  return {
    members: {
      total: totalMembers,
      active: activeMembers,
      newThisMonth: newMembersThisMonth,
      growth: memberGrowth,
    },
    messages: {
      total: totalMessages,
      sent: sentMessages,
      breakdown: messageBreakdown.map((b) => ({
        type: b.messageType,
        count: b._count._all,
      })),
    },
    templates: { total: totalTemplates },
    automation: { total: totalAutomations, active: activeAutomations },
  };
}

async function getMemberGrowth(organizationId?: string) {
  const months: { month: string; count: number }[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const where = organizationId
      ? { organizationId, createdAt: { gte: start, lte: end } }
      : { createdAt: { gte: start, lte: end } };

    const count = await prisma.member.count({ where });
    months.push({
      month: start.toLocaleString("default", { month: "short", year: "2-digit" }),
      count,
    });
  }

  return months;
}
