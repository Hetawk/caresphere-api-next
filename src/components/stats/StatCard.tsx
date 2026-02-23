import { cn, formatNumber } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  /** e.g. "+12% this month" */
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  subtext,
  trend = "neutral",
  className,
}: StatCardProps) {
  const trendColor = {
    up: "text-[#6B7C5E]",
    down: "text-[#8E0E00]",
    neutral: "text-[rgba(26,26,26,0.5)]",
  }[trend];

  return (
    <div className={cn("cs-card p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-[rgba(26,26,26,0.5)]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-[#1F1C18]">
            {typeof value === "number" ? formatNumber(value) : value}
          </p>
          {subtext && (
            <p className={cn("mt-1 text-xs font-medium", trendColor)}>
              {subtext}
            </p>
          )}
        </div>
        <div className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF6A] to-[#C8A061]">
          <Icon className="h-5 w-5 text-[#1F1C18]" />
        </div>
      </div>
    </div>
  );
}
