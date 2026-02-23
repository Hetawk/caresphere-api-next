"use client";
import { useState, useCallback } from "react";
import { ShieldCheck, PlusCircle, Trash2, UserCog } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import { formatDate, getInitials, roleLabel } from "@/lib/utils";
import { ROLE_BADGE, ROLE_BADGE_DEFAULT, ALL_ROLES } from "@/lib/constants";
import type { AdminUser } from "@/lib/types";

export default function AdminUsersPage() {
  const { toasts, toast, remove } = useToast();
  const { data, loading, error, refetch } = useApi<AdminUser[]>("/admin/users");
  const users = Array.isArray(data) ? data : [];

  /* ── Create user modal ── */
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "MEMBER",
    password: "",
    confirmPassword: "",
  });
  const [creating, setCreating] = useState(false);

  /* ── Edit role/status modal ── */
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const handleCreate = useCallback(async () => {
    const { firstName, lastName, email, role, password, confirmPassword } =
      createForm;
    if (!firstName || !lastName || !email || !password) {
      toast.error("All required fields must be filled.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setCreating(true);
    const res = await api.post<AdminUser>("/admin/users", {
      firstName,
      lastName,
      email,
      role,
      password,
    });
    setCreating(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`User ${firstName} ${lastName} created.`);
    setShowCreate(false);
    setCreateForm({
      firstName: "",
      lastName: "",
      email: "",
      role: "MEMBER",
      password: "",
      confirmPassword: "",
    });
    refetch();
  }, [createForm, toast, refetch]);

  const openEdit = useCallback((u: AdminUser) => {
    setEditing(u);
    // Normalise to UPPERCASE enum value from API
    setEditRole(String(u.role).toUpperCase());
    setEditStatus(u.status ?? (u.isActive ? "ACTIVE" : "INACTIVE"));
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editing) return;
    setEditSaving(true);
    const res = await api.patch(`/admin/users/${editing.id}`, {
      role: editRole,
      status: editStatus, // UserStatus enum: ACTIVE | INACTIVE | SUSPENDED
    });
    setEditSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("User updated.");
    setEditing(null);
    refetch();
  }, [editing, editRole, editStatus, toast, refetch]);

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Permanently delete user "${name}"? This cannot be undone.`))
        return;
      const res = await api.delete(`/admin/users/${id}`);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("User deleted.");
      refetch();
    },
    [toast, refetch],
  );

  const cf =
    (k: keyof typeof createForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setCreateForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={remove} />
      <PageHeader
        title="User Management"
        subtitle={`${users.length} system user${users.length === 1 ? "" : "s"}`}
        action={{
          label: "Create User",
          icon: PlusCircle,
          onClick: () => setShowCreate(true),
        }}
      />

      {/* Notice banner */}
      <div className="flex items-start gap-3 rounded-lg border border-[rgba(24,46,95,0.2)] bg-[rgba(24,46,95,0.05)] px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#182E5F]" />
        <p className="text-sm text-[#182E5F]">
          Admin-only area. Changes here affect login access and permissions
          across the system.
        </p>
      </div>

      {/* Users table */}
      <div className="cs-card overflow-hidden p-0">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner size="lg" className="text-[#C8A061]" />
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-[#8E0E00]">{error}</p>
        ) : users.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 text-[rgba(26,26,26,0.45)]">
            <UserCog className="h-8 w-8" />
            <p className="text-sm">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E3D4C2] bg-[rgba(212,175,106,0.06)]">
                  {[
                    "User",
                    "Email",
                    "Role",
                    "Status",
                    "Created",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.45)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const badge =
                    ROLE_BADGE[String(u.role)] ?? ROLE_BADGE_DEFAULT;
                  const active =
                    u.isActive ??
                    (u.status === "ACTIVE" || u.status === "active");
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-[#E3D4C2] last:border-0 hover:bg-[rgba(212,175,106,0.04)]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1F1C18] text-xs font-semibold text-[#D4AF6A]">
                            {getInitials(`${u.firstName} ${u.lastName}`)}
                          </div>
                          <p className="font-medium text-[#1F1C18]">
                            {u.firstName} {u.lastName}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[rgba(26,26,26,0.7)]">
                        {u.email}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge}`}
                        >
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${active ? "bg-emerald-50 text-emerald-700" : "bg-[rgba(142,14,0,0.07)] text-[#8E0E00]"}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-[#8E0E00]"}`}
                          />
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[rgba(26,26,26,0.55)]">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openEdit(u)}
                            className="flex items-center gap-1 text-xs text-[#C8A061] hover:underline"
                          >
                            <UserCog className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(u.id, `${u.firstName} ${u.lastName}`)
                            }
                            className="flex items-center gap-1 text-xs text-[#8E0E00] hover:underline"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create user modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="cs-card w-full max-w-md space-y-4 p-6">
            <h2 className="text-lg font-semibold text-[#1F1C18]">
              Create User
            </h2>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                    First Name *
                  </label>
                  <input
                    className="cs-input w-full"
                    value={createForm.firstName}
                    onChange={cf("firstName")}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                    Last Name *
                  </label>
                  <input
                    className="cs-input w-full"
                    value={createForm.lastName}
                    onChange={cf("lastName")}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                  Email *
                </label>
                <input
                  type="email"
                  className="cs-input w-full"
                  value={createForm.email}
                  onChange={cf("email")}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                  Role *
                </label>
                <select
                  className="cs-input w-full"
                  value={createForm.role}
                  onChange={cf("role")}
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                  Password *
                </label>
                <input
                  type="password"
                  className="cs-input w-full"
                  value={createForm.password}
                  onChange={cf("password")}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  className="cs-input w-full"
                  value={createForm.confirmPassword}
                  onChange={cf("confirmPassword")}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                className="cs-btn-ghost"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
              <button
                className="cs-btn-primary flex items-center gap-2"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating && <Spinner size="sm" />} Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="cs-card w-full max-w-sm space-y-4 p-6">
            <h2 className="text-lg font-semibold text-[#1F1C18]">
              Edit User — {editing.firstName} {editing.lastName}
            </h2>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                  Role
                </label>
                <select
                  className="cs-input w-full"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                  Account Status
                </label>
                <select
                  className="cs-input w-full"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button className="cs-btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                className="cs-btn-primary flex items-center gap-2"
                onClick={handleEditSave}
                disabled={editSaving}
              >
                {editSaving && <Spinner size="sm" />} Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
