/** Shared TypeScript types for the CareSphere admin frontend */

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MINISTRY_LEADER"
  | "VOLUNTEER"
  | "MEMBER"
  | "super_admin"
  | "admin"
  | "ministry_leader"
  | "volunteer"
  | "member";

export type UserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "PENDING"
  | "active"
  | "inactive"
  | "suspended"
  | "pending";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  organizationId?: string;
  avatarUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  type: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  description?: string;
  bibleEnabled?: boolean;
  createdAt: string;
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  /** API may use membershipStatus or status */
  membershipStatus: string;
  status?: string;
  membershipDate?: string;
  joinDate?: string;
  gender?: string;
  maritalStatus?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  dateOfBirth?: string;
  createdAt: string;
  organizationId: string;
}

export interface Message {
  id: string;
  subject: string;
  title?: string;
  body?: string;
  content?: string;
  status: string;
  messageType: string;
  recipientType?: string;
  recipientCount?: number;
  sentAt?: string;
  scheduledFor?: string;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  subject: string;
  body?: string;
  content?: string;
  type: string;
  isActive: boolean;
  createdAt: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  /** Trigger event name */
  trigger: string;
  triggerType?: string;
  action: string;
  delayDays: number;
  isActive: boolean;
  lastTriggeredAt?: string;
  templateId?: string;
  createdAt: string;
}

export interface AnalyticsDashboard {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  totalMessages: number;
  messagesSentThisMonth: number;
  activeAutomations: number;
  memberGrowth?: { month: string; count: number }[];
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  /** Convenience boolean derived from status */
  isActive: boolean;
  status?: UserStatus;
  createdAt: string;
  organizationId?: string;
}

export interface PaginatedResponse<T> {
  /** API may return either key */
  items?: T[];
  data?: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResult<T> {
  data?: T;
  error?: string;
}
