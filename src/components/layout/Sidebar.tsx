"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  NAV_ITEMS,
  ADMIN_NAV_ITEMS,
  PLATFORM_NAV_ITEMS,
  ROUTES,
} from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  Zap,
  Settings,
  ShieldCheck,
  Shield,
  LogOut,
  ChevronRight,
  Globe,
  Users2,
} from "lucide-react";

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  Zap,
  Settings,
  ShieldCheck,
  Shield,
  Globe,
  Users2,
};

interface NavItemProps {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  collapsed?: boolean;
}

function NavItem({ href, icon, label, active, collapsed }: NavItemProps) {
  const Icon = ICON_MAP[icon] ?? ChevronRight;
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
        active
          ? "bg-[rgba(212,175,106,0.18)] text-[#D4AF6A]"
          : "text-[#A09080] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#E6E6E6]",
      )}
      title={collapsed ? label : undefined}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active
            ? "text-[#D4AF6A]"
            : "text-[#706050] group-hover:text-[#E6E6E6]",
        )}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin, isKingdomAdmin } = useAuth();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-[rgba(255,255,255,0.08)] bg-[#1F1C18]">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.08)] px-4 py-4">
        <Image
          src="/logo-dark.svg"
          alt="CareSphere"
          width={36}
          height={36}
          className="shrink-0"
        />
        <div>
          <p className="text-sm font-bold tracking-wide text-[#E6E6E6]">
            CareSphere
          </p>
          <p className="text-[10px] text-[#706050]">Community Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            active={
              item.href === ROUTES.dashboard
                ? pathname === item.href
                : pathname.startsWith(item.href)
            }
          />
        ))}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-[rgba(255,255,255,0.06)]" />
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#504840]">
              Admin
            </p>
            {ADMIN_NAV_ITEMS.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                active={pathname.startsWith(item.href)}
              />
            ))}
          </>
        )}

        {isKingdomAdmin && (
          <>
            <div className="my-3 border-t border-[rgba(255,255,255,0.06)]" />
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#504840]">
              Platform
            </p>
            {PLATFORM_NAV_ITEMS.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                active={pathname.startsWith(item.href)}
              />
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-[rgba(255,255,255,0.08)] px-3 py-3">
        {user && (
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D4AF6A] text-xs font-bold text-[#1F1C18]">
              {(user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[#E6E6E6]">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-[10px] text-[#706050]">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="rounded p-1 text-[#706050] transition-colors hover:text-[#D4AF6A]"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
