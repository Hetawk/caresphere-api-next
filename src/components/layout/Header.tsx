"use client";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Shield,
  KeyRound,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { roleLabel } from "@/lib/utils";
import { ROLE_BADGE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { UserRole } from "@prisma/client";

const ADMIN_ROLES: string[] = [
  UserRole.KINGDOM_SUPER_ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
];

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const badgeClass = ROLE_BADGE[user?.role ?? ""] ?? "cs-badge-muted";
  const initials = (user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "");
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "User";

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function navigate(path: string) {
    setOpen(false);
    router.push(path);
  }

  function handleLogout() {
    setOpen(false);
    logout();
  }

  const isAdminPlus = ADMIN_ROLES.includes(user?.role as string);

  const menuGroups = [
    {
      group: "Navigate",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
        { icon: Users, label: "Members", path: "/dashboard/members" },
        { icon: Settings, label: "Settings", path: "/dashboard/settings" },
        ...(isAdminPlus
          ? [
              {
                icon: Shield,
                label: "Admin Users",
                path: "/dashboard/admin/users",
              },
            ]
          : []),
      ],
    },
    {
      group: "Account",
      items: [
        {
          icon: UserCircle,
          label: "My Profile",
          path: "/dashboard/settings?tab=profile",
        },
        {
          icon: KeyRound,
          label: "Change Password",
          path: "/dashboard/settings?tab=profile",
        },
      ],
    },
  ];

  return (
    <header className="flex h-14 items-center justify-between border-b border-[#E3D4C2] bg-[#FDFAF6] px-6">
      <div />

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button className="relative rounded-lg p-2 text-[#897A61] transition-colors hover:bg-[#EFE6DC] hover:text-[#1F1C18]">
          <Bell className="h-4 w-4" />
        </button>

        {/* User menu */}
        {user && (
          <div className="relative" ref={menuRef}>
            {/* Trigger button */}
            <button
              onClick={() => setOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-all duration-150",
                open ? "bg-[#EFE6DC]" : "hover:bg-[#EFE6DC]",
              )}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F1C18] text-xs font-bold text-[#D4AF6A]">
                {initials || "?"}
              </div>
              <div className="hidden sm:flex sm:flex-col sm:items-start">
                <span className="max-w-[120px] truncate text-sm font-semibold leading-tight text-[#1F1C18]">
                  {fullName}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-px text-[10px] font-medium",
                    badgeClass,
                  )}
                >
                  {roleLabel(user.role)}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-[rgba(26,26,26,0.4)] transition-transform duration-200",
                  open && "rotate-180",
                )}
              />
            </button>

            {/* Dropdown panel */}
            {open && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[#E3D4C2] bg-white shadow-xl shadow-[rgba(26,26,26,0.12)]"
              >
                {/* User card */}
                <div className="flex items-center gap-3 border-b border-[#F0E8DA] bg-[#FAF7F3] px-4 py-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1F1C18] text-sm font-bold text-[#D4AF6A]">
                    {initials || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1F1C18]">
                      {fullName}
                    </p>
                    <p className="truncate text-xs text-[rgba(26,26,26,0.5)]">
                      {user.email}
                    </p>
                    <span
                      className={cn(
                        "mt-0.5 inline-flex rounded-full px-2 py-px text-[10px] font-medium",
                        badgeClass,
                      )}
                    >
                      {roleLabel(user.role)}
                    </span>
                  </div>
                </div>

                {/* Menu groups */}
                {menuGroups.map((group, gi) => (
                  <div key={group.group}>
                    {gi > 0 && <div className="border-t border-[#F0E8DA]" />}
                    <div className="py-1">
                      <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-[rgba(26,26,26,0.35)]">
                        {group.group}
                      </p>
                      {group.items.map((item) => (
                        <button
                          key={item.label}
                          role="menuitem"
                          onClick={() => navigate(item.path)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[#1F1C18] transition-colors hover:bg-[#FAF7F3]"
                        >
                          <item.icon className="h-4 w-4 shrink-0 text-[#897A61]" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Sign out */}
                <div className="border-t border-[#F0E8DA] py-1">
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-[#8E0E00] transition-colors hover:bg-[#FFF5F5]"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
