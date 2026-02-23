import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format ISO date string to readable form */
export function formatDate(
  date: string | Date | null | undefined,
  opts?: Intl.DateTimeFormatOptions,
) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...opts,
  }).format(new Date(date));
}

/** Format a number with commas */
export function formatNumber(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

/** Truncate a string with ellipsis */
export function truncate(str: string, maxLen = 60) {
  return str.length > maxLen ? str.slice(0, maxLen) + "…" : str;
}

/** Get user initials for avatar display */
export function getInitials(firstName?: string, lastName?: string) {
  const f = (firstName ?? "").charAt(0).toUpperCase();
  const l = (lastName ?? "").charAt(0).toUpperCase();
  return f + l || "?";
}

/** Map a role key to its human-readable display label */
export function roleLabel(role: string) {
  const map: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    MINISTRY_LEADER: "Ministry Leader",
    VOLUNTEER: "Volunteer",
    MEMBER: "Member",
  };
  return map[role] ?? role;
}

/** Map a status key to a display label */
export function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
}
