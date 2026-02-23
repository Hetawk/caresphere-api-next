"use client";
import { useState, useCallback, useEffect } from "react";
import {
  Users2,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Shield,
  User,
  Crown,
  Building2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApi } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

type UserRole =
  | "KINGDOM_SUPER_ADMIN"
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MEMBER"
  | "VIEWER";
type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

interface PlatformUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  organization?: { id: string; name: string; organizationCode: string } | null;
}

interface PaginatedUsers {
  items: PlatformUser[];
  total: number;
  page: number;
  totalPages: number;
}

const ROLES: UserRole[] = [
  "KINGDOM_SUPER_ADMIN",
  "SUPER_ADMIN",
  "ADMIN",
  "MEMBER",
  "VIEWER",
];

const ROLE_META: Record<
  UserRole,
  { label: string; icon: React.ElementType; color: string }
> = {
  KINGDOM_SUPER_ADMIN: {
    label: "Kingdom Admin",
    icon: Crown,
    color: "text-amber-700 bg-amber-50 border-amber-300",
  },
  SUPER_ADMIN: {
    label: "Super Admin",
    icon: ShieldCheck,
    color: "text-violet-700 bg-violet-50 border-violet-300",
  },
  ADMIN: {
    label: "Admin",
    icon: Shield,
    color: "text-blue-700 bg-blue-50 border-blue-300",
  },
  MEMBER: {
    label: "Member",
    icon: User,
    color: "text-slate-700 bg-slate-50 border-slate-300",
  },
  VIEWER: {
    label: "Viewer",
    icon: User,
    color: "text-gray-600 bg-gray-50 border-gray-300",
  },
};

const STATUS_META = {
  ACTIVE: {
    label: "Active",
    icon: CheckCircle,
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  INACTIVE: {
    label: "Inactive",
    icon: XCircle,
    color: "text-slate-600 bg-slate-50 border-slate-200",
  },
  SUSPENDED: {
    label: "Suspended",
    icon: XCircle,
    color: "text-red-700 bg-red-50 border-red-200",
  },
};

function RoleSelector({
  userId,
  currentRole,
  onUpdate,
}: {
  userId: string;
  currentRole: UserRole;
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toasts, toast } = useToast();
  const meta = ROLE_META[currentRole] ?? ROLE_META.MEMBER;
  const Icon = meta.icon;

  const handleChange = useCallback(
    async (newRole: UserRole) => {
      if (newRole === currentRole) {
        setEditing(false);
        return;
      }
      setSaving(true);
      const res = await api.patch(`/platform/users/${userId}`, {
        role: newRole,
      });
      setSaving(false);
      setEditing(false);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      onUpdate();
    },
    [userId, currentRole, onUpdate, toast],
  );

  if (editing) {
    return (
      <div className="relative z-10">
        {saving ? (
          <Spinner size="sm" />
        ) : (
          <div className="absolute right-0 top-0 w-44 rounded-xl border border-[#E3D4C2] bg-white shadow-lg py-1">
            {ROLES.map((r) => {
              const m = ROLE_META[r];
              const I = m.icon;
              return (
                <button
                  key={r}
                  onClick={() => handleChange(r)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-[#FAF7F3] ${r === currentRole ? "font-semibold text-[#C8A061]" : "text-[rgba(26,26,26,0.7)]"}`}
                >
                  <I className="h-3.5 w-3.5" />
                  {m.label}
                </button>
              );
            })}
            <button
              onClick={() => setEditing(false)}
              className="mt-1 w-full border-t border-[#E3D4C2] px-3 py-2 text-left text-xs text-[rgba(26,26,26,0.4)]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:opacity-80 ${meta.color}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </button>
  );
}

export default function PlatformUsersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toasts, toast, remove } = useToast();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!authLoading && user?.role !== "KINGDOM_SUPER_ADMIN") {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  const { data, loading, error } = useApi<PaginatedUsers>(
    `/platform/users?q=${encodeURIComponent(search)}&page=${page}&limit=20&_k=${refreshKey}`,
  );

  const users = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(q);
    setPage(1);
  };

  const handleStatusToggle = useCallback(
    async (userId: string, current: UserStatus) => {
      const next = current === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const res = await api.patch(`/platform/users/${userId}`, {
        status: next,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setRefreshKey((k) => k + 1);
    },
    [toast],
  );

  if (authLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Spinner size="lg" className="text-[#C8A061]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={remove} />
      <PageHeader
        title="All Users"
        subtitle="Platform-wide user management — change roles and status across all organizations"
      />

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(26,26,26,0.35)]" />
          <input
            className="cs-input w-full pl-9"
            placeholder="Search by name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button type="submit" className="cs-btn-primary px-5">
          Search
        </button>
        {search && (
          <button
            type="button"
            className="cs-btn-ghost px-4 text-sm"
            onClick={() => {
              setSearch("");
              setQ("");
              setPage(1);
            }}
          >
            Clear
          </button>
        )}
      </form>

      {data && (
        <p className="text-sm text-[rgba(26,26,26,0.5)]">
          {data.total} user{data.total !== 1 ? "s" : ""} found
          {search && ` · filtered by "${search}"`}
        </p>
      )}

      {/* Table */}
      <div className="cs-card overflow-hidden p-0">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 border-b border-[#E3D4C2] bg-[#FAF7F3] px-6 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[rgba(26,26,26,0.5)]">
          <span>User</span>
          <span>Organization</span>
          <span>Role</span>
          <span>Status</span>
          <span>Joined</span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size="lg" className="text-[#C8A061]" />
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-[#8E0E00]">{error}</p>
        ) : users.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-[rgba(26,26,26,0.45)]">
            <Users2 className="h-10 w-10" />
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E3D4C2]">
            {users.map((u) => {
              const statusMeta = STATUS_META[u.status] ?? STATUS_META.INACTIVE;
              const SIcon = statusMeta.icon;
              return (
                <div
                  key={u.id}
                  className="relative grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-4 px-6 py-4 hover:bg-[rgba(212,175,106,0.04)]"
                >
                  {/* User info */}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#1F1C18]">
                      {u.firstName} {u.lastName}
                      {u.id === user?.id && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-[#C8A061]">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-[rgba(26,26,26,0.45)]">
                      {u.email}
                    </p>
                  </div>
                  {/* Org */}
                  <div className="min-w-0 flex items-center gap-1.5 text-xs text-[rgba(26,26,26,0.55)]">
                    {u.organization ? (
                      <>
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{u.organization.name}</span>
                        <span className="ml-1 font-mono text-[10px] text-[rgba(26,26,26,0.35)]">
                          {u.organization.organizationCode}
                        </span>
                      </>
                    ) : (
                      <span className="italic text-[rgba(26,26,26,0.35)]">
                        No organization
                      </span>
                    )}
                  </div>
                  {/* Role */}
                  <div className="relative">
                    <RoleSelector
                      userId={u.id}
                      currentRole={u.role}
                      onUpdate={() => setRefreshKey((k) => k + 1)}
                    />
                  </div>
                  {/* Status */}
                  <button
                    onClick={() => handleStatusToggle(u.id, u.status)}
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:opacity-75 ${statusMeta.color}`}
                    title={`Toggle status (currently ${u.status})`}
                  >
                    <SIcon className="h-3 w-3" />
                    {statusMeta.label}
                  </button>
                  {/* Date */}
                  <span className="text-xs text-[rgba(26,26,26,0.4)]">
                    {formatDate(u.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[rgba(26,26,26,0.5)]">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="cs-btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="cs-btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
