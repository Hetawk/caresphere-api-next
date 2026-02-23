"use client";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { roleLabel } from "@/lib/utils";
import { ROLE_BADGE } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth();
  const badgeClass = ROLE_BADGE[user?.role ?? ""] ?? "cs-badge-muted";

  return (
    <header className="flex h-14 items-center justify-between border-b border-[#E3D4C2] bg-[#FDFAF6] px-6">
      <div>
        {title && (
          <h1 className="text-base font-semibold text-[#1F1C18]">{title}</h1>
        )}
        {subtitle && (
          <p className="text-xs text-[rgba(26,26,26,0.55)]">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button className="relative rounded-lg p-2 text-[#897A61] transition-colors hover:bg-[#EFE6DC] hover:text-[#1F1C18]">
          <Bell className="h-4 w-4" />
        </button>
        {user && (
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                badgeClass,
              )}
            >
              {roleLabel(user.role)}
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F1C18] text-xs font-bold text-[#D4AF6A]">
              {(user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
