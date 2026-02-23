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

/** Items only visible to admins */
export const ADMIN_NAV_ITEMS = [
  {
    label: "User Management",
    href: ROUTES.adminUsers,
    icon: "ShieldCheck",
  },
] as const;

/** CSS class per role — supports both UPPER and lowercase API values */
export const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: "cs-badge-gold",
  ADMIN: "cs-badge-navy",
  MINISTRY_LEADER: "cs-badge-maroon",
  VOLUNTEER: "bg-amber-50 text-amber-700 border border-amber-200",
  MEMBER: "cs-badge-muted",
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

export const ALL_ROLES = [
  "super_admin",
  "admin",
  "ministry_leader",
  "volunteer",
  "member",
] as const;

export const MEMBER_STATUSES = [
  "active",
  "inactive",
  "pending",
  "needs_follow_up",
] as const;
