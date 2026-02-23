"use client";
import { useState, useCallback } from "react";
import { PlusCircle, Search, User, Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import { formatDate, getInitials, statusLabel, roleLabel } from "@/lib/utils";
import {
  STATUS_BADGE,
  STATUS_BADGE_DEFAULT,
  MEMBER_STATUSES,
} from "@/lib/constants";
import type { Member, PaginatedResponse } from "@/lib/types";

export default function MembersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const { toasts, toast, remove } = useToast();

  const query = new URLSearchParams({
    ...(search ? { search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    page: String(page),
    limit: "20",
  }).toString();

  const { data, loading, error, refetch } = useApi<PaginatedResponse<Member>>(
    `/members?${query}`,
  );

  const members = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  /* ── Add-member modal state ── */
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    membershipStatus: "active",
    membershipDate: "",
  });
  const [adding, setAdding] = useState(false);

  const handleAdd = useCallback(async () => {
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error("First name, last name and email are required.");
      return;
    }
    setAdding(true);
    const res = await api.post<Member>("/members", form);
    setAdding(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Member added successfully.");
    setShowAdd(false);
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      gender: "",
      maritalStatus: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      membershipStatus: "active",
      membershipDate: "",
    });
    refetch();
  }, [form, toast, refetch]);

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
      const res = await api.delete(`/members/${id}`);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Member removed.");
      refetch();
    },
    [toast, refetch],
  );

  const field =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={remove} />
      <PageHeader
        title="Members"
        subtitle={`${total} total member${total === 1 ? "" : "s"}`}
        action={{
          label: "Add Member",
          icon: PlusCircle,
          onClick: () => setShowAdd(true),
        }}
      />

      {/* Filters */}
      <div className="cs-card flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(26,26,26,0.4)]" />
          <input
            className="cs-input w-full pl-9"
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="cs-input"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {MEMBER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="cs-card overflow-hidden p-0">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner size="lg" className="text-[#C8A061]" />
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-[#8E0E00]">{error}</p>
        ) : members.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-[rgba(26,26,26,0.45)]">
            <User className="h-8 w-8" />
            <p className="text-sm">No members found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E3D4C2] bg-[rgba(212,175,106,0.06)]">
                  {["Member", "Email", "Phone", "Status", "Joined", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.45)]"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const badge =
                    STATUS_BADGE[
                      String(m.membershipStatus ?? m.status ?? "")
                    ] ?? STATUS_BADGE_DEFAULT;
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-[#E3D4C2] last:border-0 hover:bg-[rgba(212,175,106,0.04)]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1F1C18] text-xs font-semibold text-[#D4AF6A]">
                            {getInitials(`${m.firstName} ${m.lastName}`)}
                          </div>
                          <div>
                            <p className="font-medium text-[#1F1C18]">
                              {m.firstName} {m.lastName}
                            </p>
                            {m.gender && (
                              <p className="text-xs text-[rgba(26,26,26,0.45)] capitalize">
                                {m.gender}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-[rgba(26,26,26,0.7)]">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          {m.email ?? (
                            <span className="italic text-[rgba(26,26,26,0.35)]">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-[rgba(26,26,26,0.7)]">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          {m.phone ?? (
                            <span className="italic text-[rgba(26,26,26,0.35)]">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge}`}
                        >
                          {statusLabel(m.membershipStatus ?? m.status ?? "")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[rgba(26,26,26,0.6)]">
                        {m.membershipDate ? formatDate(m.membershipDate) : "—"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() =>
                            handleDelete(m.id, `${m.firstName} ${m.lastName}`)
                          }
                          className="text-xs text-[#8E0E00] hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
              className="cs-btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="cs-btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add member modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="cs-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#1F1C18]">Add Member</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: "firstName", label: "First Name *", type: "text" },
                { k: "lastName", label: "Last Name *", type: "text" },
                { k: "email", label: "Email *", type: "email" },
                { k: "phone", label: "Phone", type: "tel" },
                { k: "dateOfBirth", label: "Date of Birth", type: "date" },
                { k: "membershipDate", label: "Membership Date", type: "date" },
                { k: "address", label: "Address", type: "text" },
                { k: "city", label: "City", type: "text" },
                { k: "state", label: "State", type: "text" },
                { k: "zipCode", label: "ZIP Code", type: "text" },
              ].map(({ k, label, type }) => (
                <div key={k} className={k === "address" ? "col-span-2" : ""}>
                  <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                    {label}
                  </label>
                  <input
                    type={type}
                    className="cs-input w-full"
                    value={form[k as keyof typeof form]}
                    onChange={field(k as keyof typeof form)}
                  />
                </div>
              ))}
              {[
                {
                  k: "gender",
                  label: "Gender",
                  opts: ["male", "female", "other", "prefer_not_to_say"],
                },
                {
                  k: "maritalStatus",
                  label: "Marital Status",
                  opts: ["single", "married", "divorced", "widowed"],
                },
                {
                  k: "membershipStatus",
                  label: "Status",
                  opts: MEMBER_STATUSES,
                },
              ].map(({ k, label, opts }) => (
                <div key={k}>
                  <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                    {label}
                  </label>
                  <select
                    className="cs-input w-full"
                    value={form[k as keyof typeof form]}
                    onChange={field(k as keyof typeof form)}
                  >
                    <option value="">Select…</option>
                    {opts.map((o) => (
                      <option key={o} value={o}>
                        {statusLabel(o)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                className="cs-btn-ghost"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </button>
              <button
                className="cs-btn-primary flex items-center gap-2"
                onClick={handleAdd}
                disabled={adding}
              >
                {adding && <Spinner size="sm" />} Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
