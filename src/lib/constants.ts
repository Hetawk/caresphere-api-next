/** CareSphere frontend constants — navigation, roles, colours */

export const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  members: "/dashboard/members",
  messages: "/dashboard/messages",
  templates: "/dashboard/templates",
  automation: "/dashboard/automation",
  settings: "/dashboard/settings",
  adminUsers: "/dashboard/admin/users",
  adminRoles: "/dashboard/admin/roles",
  // Platform-level (KINGDOM_SUPER_ADMIN only)
  platformOrgs: "/dashboard/platform/organizations",
  platformUsers: "/dashboard/platform/users",
} as const;

/** Sidebar navigation items */
export const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: ROUTES.dashboard,
    icon: "LayoutDashboard",
  },
  {
    label: "Members",
    href: ROUTES.members,
    icon: "Users",
  },
  {
    label: "Messages",
    href: ROUTES.messages,
    icon: "Mail",
  },
  {
    label: "Templates",
    href: ROUTES.templates,
    icon: "FileText",
  },
  {
    label: "Automation",
    href: ROUTES.automation,
    icon: "Zap",
  },
  {
    label: "Settings",
    href: ROUTES.settings,
    icon: "Settings",
  },
] as const;

/** Items only visible to org admins (SUPER_ADMIN / ADMIN) */
export const ADMIN_NAV_ITEMS = [
  {
    label: "User Management",
    href: ROUTES.adminUsers,
    icon: "ShieldCheck",
  },
  {
    label: "Roles & Permissions",
    href: ROUTES.adminRoles,
    icon: "Shield",
  },
] as const;

/** Items only visible to KINGDOM_SUPER_ADMIN — platform-level control */
export const PLATFORM_NAV_ITEMS = [
  {
    label: "All Organizations",
    href: ROUTES.platformOrgs,
    icon: "Globe",
  },
  {
    label: "All Users",
    href: ROUTES.platformUsers,
    icon: "Users2",
  },
] as const;

/**
 * CSS class per role.
 * Always use the UPPERCASE Prisma enum value (SUPER_ADMIN, ADMIN, …).
 * Lowercase variants kept for backwards-compat with any old API responses.
 */
export const ROLE_BADGE: Record<string, string> = {
  // ── Platform ──────────────────────────────────────────────────
  KINGDOM_SUPER_ADMIN:
    "bg-gradient-to-r from-[#8E0E00] to-[#C8A061] text-white border-0 font-bold",
  // ── Org-level ─────────────────────────────────────────────────
  SUPER_ADMIN: "cs-badge-gold",
  ADMIN: "cs-badge-navy",
  MINISTRY_LEADER: "cs-badge-maroon",
  VOLUNTEER: "bg-amber-50 text-amber-700 border border-amber-200",
  MEMBER: "cs-badge-muted",
  // ── Legacy lowercase ──────────────────────────────────────────
  kingdom_super_admin:
    "bg-gradient-to-r from-[#8E0E00] to-[#C8A061] text-white border-0 font-bold",
  super_admin: "cs-badge-gold",
  admin: "cs-badge-navy",
  ministry_leader: "cs-badge-maroon",
  volunteer: "bg-amber-50 text-amber-700 border border-amber-200",
  member: "cs-badge-muted",
};
export const ROLE_BADGE_DEFAULT = "cs-badge-muted";

/** CSS class per member/user status — supports both UPPER and lowercase */
export const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "cs-badge-success",
  INACTIVE: "cs-badge-muted",
  PENDING: "cs-badge-gold",
  SUSPENDED: "cs-badge-maroon",
  NEEDS_FOLLOW_UP: "cs-badge-gold",
  active: "cs-badge-success",
  inactive: "cs-badge-muted",
  pending: "cs-badge-gold",
  suspended: "cs-badge-maroon",
  needs_follow_up: "cs-badge-gold",
};
export const STATUS_BADGE_DEFAULT = "cs-badge-muted";

/**
 * All UserRole enum values in display order (UPPERCASE matches Prisma enum).
 * KINGDOM_SUPER_ADMIN is omitted from org-level dropdowns — it is assigned only
 * by the seeder/platform and cannot be self-selected.
 */
export const ALL_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MINISTRY_LEADER",
  "VOLUNTEER",
  "MEMBER",
] as const;

export type AppRole = (typeof ALL_ROLES)[number];

export const MEMBER_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "PENDING",
  "NEEDS_FOLLOW_UP",
] as const;
