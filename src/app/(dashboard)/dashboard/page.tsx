"use client";
import {
  Users,
  Mail,
  Zap,
  UserCheck,
  TrendingUp,
  FileText,
} from "lucide-react";
import { StatCard } from "@/components/stats/StatCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApi } from "@/hooks/use-api";
import type { AnalyticsDashboard } from "@/lib/types";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { data, loading, error } = useApi<AnalyticsDashboard>("/analytics");

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" className="text-[#C8A061]" />
      </div>
    );
  }

  const stats = [
    {
      label: "Total Members",
      value: data?.totalMembers ?? 0,
      icon: Users,
      subtext: data?.newMembersThisMonth
        ? `+${data.newMembersThisMonth} this month`
        : undefined,
      trend: "up" as const,
    },
    {
      label: "Active Members",
      value: data?.activeMembers ?? 0,
      icon: UserCheck,
      subtext: data?.totalMembers
        ? `${Math.round(((data.activeMembers ?? 0) / data.totalMembers) * 100)}% of total`
        : undefined,
      trend: "neutral" as const,
    },
    {
      label: "Messages Sent",
      value: data?.messagesSentThisMonth ?? 0,
      icon: Mail,
      subtext: "This month",
      trend: "up" as const,
    },
    {
      label: "Active Automations",
      value: data?.activeAutomations ?? 0,
      icon: Zap,
      trend: "neutral" as const,
    },
    {
      label: "Total Messages",
      value: data?.totalMessages ?? 0,
      icon: TrendingUp,
      trend: "neutral" as const,
    },
    {
      label: "New Members",
      value: data?.newMembersThisMonth ?? 0,
      icon: FileText,
      subtext: "This month",
      trend: data?.newMembersThisMonth ? ("up" as const) : ("neutral" as const),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Overview — ${formatDate(new Date())}`}
      />

      {error && (
        <div className="rounded-lg border border-[#8E0E00]/20 bg-[rgba(142,14,0,0.06)] px-4 py-3 text-sm text-[#8E0E00]">
          {error}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Growth chart placeholder */}
      {data?.memberGrowth && data.memberGrowth.length > 0 && (
        <div className="cs-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.5)]">
            Member Growth
          </h2>
          <div className="flex h-36 items-end gap-2">
            {data.memberGrowth.map((p) => {
              const max = Math.max(
                ...data.memberGrowth!.map((x) => x.count),
                1,
              );
              const pct = Math.round((p.count / max) * 100);
              return (
                <div
                  key={p.month}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <span className="text-[10px] text-[rgba(26,26,26,0.45)]">
                    {p.count}
                  </span>
                  <div
                    className="w-full rounded-t-sm bg-gradient-to-t from-[#C8A061] to-[#D4AF6A]"
                    style={{ height: `${pct}%`, minHeight: 4 }}
                  />
                  <span className="text-[9px] text-[rgba(26,26,26,0.4)]">
                    {p.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "View all members",
            href: "/dashboard/members",
            icon: Users,
            desc: "Manage your members",
          },
          {
            label: "Send a message",
            href: "/dashboard/messages",
            icon: Mail,
            desc: "Reach your members",
          },
          {
            label: "Create automation",
            href: "/dashboard/automation",
            icon: Zap,
            desc: "Automate workflows",
          },
        ].map((q) => (
          <a
            key={q.href}
            href={q.href}
            className="cs-card flex items-center gap-4 p-5 transition-all hover:border-[#C8A061] hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F1C18]">
              <q.icon className="h-4 w-4 text-[#D4AF6A]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1F1C18]">{q.label}</p>
              <p className="text-xs text-[rgba(26,26,26,0.5)]">{q.desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
