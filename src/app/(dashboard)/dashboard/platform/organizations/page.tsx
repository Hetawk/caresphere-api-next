"use client";
import { useState } from "react";
import {
  Globe,
  Search,
  Users,
  UserCheck,
  Building2,
  Church,
  Briefcase,
  BadgeCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApi } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { Spinner } from "@/components/ui/Spinner";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { formatDate } from "@/lib/utils";

interface OrgEntry {
  id: string;
  name: string;
  organizationCode: string;
  organizationType: "CHURCH" | "NONPROFIT" | "OTHER";
  isActive: boolean;
  createdAt: string;
  _count?: { users: number; members: number };
}

interface PaginatedOrgs {
  items: OrgEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const TYPE_META = {
  CHURCH: {
    label: "Church / Faith",
    icon: Church,
    color: "text-violet-600 bg-violet-50 border-violet-200",
  },
  NONPROFIT: {
    label: "Non-profit",
    icon: Users,
    color: "text-blue-600   bg-blue-50   border-blue-200",
  },
  OTHER: {
    label: "Other",
    icon: Briefcase,
    color: "text-slate-600  bg-slate-50  border-slate-200",
  },
};

export default function PlatformOrganizationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toasts, toast, remove } = useToast();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Guard: only KINGDOM_SUPER_ADMIN
  useEffect(() => {
    if (!authLoading && user?.role !== "KINGDOM_SUPER_ADMIN") {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  const { data, loading, error, refetch } = useApi<PaginatedOrgs>(
    `/platform/organizations?q=${encodeURIComponent(search)}&page=${page}&limit=20`,
  );

  const orgs = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(q);
    setPage(1);
  };

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
        title="All Organizations"
        subtitle="Platform-wide view of every organization on CareSphere"
      />

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(26,26,26,0.35)]" />
          <input
            className="cs-input w-full pl-9"
            placeholder="Search by name or code…"
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
              refetch();
            }}
          >
            Clear
          </button>
        )}
      </form>

      {/* Count */}
      {data && (
        <p className="text-sm text-[rgba(26,26,26,0.5)]">
          {data.total} organization{data.total !== 1 ? "s" : ""} total
          {search && ` · filtered by "${search}"`}
        </p>
      )}

      {/* List */}
      <div className="cs-card overflow-hidden p-0">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size="lg" className="text-[#C8A061]" />
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-[#8E0E00]">{error}</p>
        ) : orgs.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-[rgba(26,26,26,0.45)]">
            <Building2 className="h-10 w-10" />
            <p className="text-sm">No organizations found</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E3D4C2]">
            {orgs.map((org) => {
              const meta = TYPE_META[org.organizationType] ?? TYPE_META.OTHER;
              const Icon = meta.icon;
              return (
                <div
                  key={org.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-[rgba(212,175,106,0.04)]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0E8DA]">
                    <Icon className="h-5 w-5 text-[#C8A061]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1F1C18] truncate">
                        {org.name}
                      </span>
                      {org.isActive ? (
                        <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <Clock className="h-4 w-4 shrink-0 text-amber-400" />
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[rgba(26,26,26,0.45)]">
                      <span className="font-mono tracking-wider">
                        {org.organizationCode}
                      </span>
                      <span>·</span>
                      <span>Created {formatDate(org.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-sm text-[rgba(26,26,26,0.55)]">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>{org._count?.members ?? 0} members</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4" />
                      <span>{org._count?.users ?? 0} users</span>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.color}`}
                    >
                      {meta.label}
                    </span>
                  </div>
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
