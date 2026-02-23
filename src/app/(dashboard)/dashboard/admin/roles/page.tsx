"use client";
import { useState, useCallback } from "react";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Users,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Permission {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  category: string;
}

interface OrgRole {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  color: string;
  isSystem: boolean;
  permissions: { permission: Permission }[];
  _count: { organizationUsers: number };
}

interface OrgMember {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role: string;
  organizationMemberships?: {
    organization: { id: string; name: string };
    role: { name: string } | null;
  }[];
}

interface PermissionsResponse {
  permissions: Permission[];
  grouped: Record<string, Permission[]>;
}

// ── COLOUR PALETTE for roles ──────────────────────────────────────────────────

const COLORS = [
  "#6B7280", // slate
  "#C8A061", // gold
  "#1F1C18", // dark
  "#8E0E00", // maroon
  "#0E5A8E", // navy
  "#0E8E4A", // emerald
  "#8E0E6B", // violet
  "#E56B00", // amber
];

// ── Modal ─────────────────────────────────────────────────────────────────────

interface RoleFormProps {
  initial?: Partial<OrgRole>;
  permissions: PermissionsResponse | null;
  onClose: () => void;
  onSave: (role: OrgRole) => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

function RoleFormModal({
  initial,
  permissions,
  onClose,
  onSave,
  toast,
}: RoleFormProps) {
  const [form, setForm] = useState({
    displayName: initial?.displayName ?? "",
    description: initial?.description ?? "",
    color: initial?.color ?? "#6B7280",
    permissionIds: initial?.permissions?.map((p) => p.permission.id) ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const togglePerm = (id: string) =>
    setForm((f) => ({
      ...f,
      permissionIds: f.permissionIds.includes(id)
        ? f.permissionIds.filter((x) => x !== id)
        : [...f.permissionIds, id],
    }));

  const handleSave = async () => {
    if (!form.displayName.trim()) {
      toast.error("Role name is required.");
      return;
    }
    setSaving(true);
    const payload = {
      displayName: form.displayName.trim(),
      description: form.description,
      color: form.color,
      permissionIds: form.permissionIds,
      // name is derived from displayName for new roles
      ...(initial?.id
        ? {}
        : { name: form.displayName.trim().toLowerCase().replace(/\s+/g, "_") }),
    };
    const res = initial?.id
      ? await api.patch(`/admin/roles/${initial.id}`, payload)
      : await api.post("/admin/roles", payload);
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    onSave(res.data as OrgRole);
  };

  const grouped = permissions?.grouped ?? {};
  const categories = Object.keys(grouped).sort();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E3D4C2] p-5">
          <h2 className="flex items-center gap-2 text-base font-bold text-[#1F1C18]">
            <Shield className="h-5 w-5 text-[#C8A061]" />
            {initial?.id ? "Edit Role" : "Create Custom Role"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[rgba(26,26,26,0.4)] hover:bg-[#F5EFE6] hover:text-[#1F1C18]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
              Role Name *
            </label>
            <input
              className="cs-input w-full"
              placeholder="e.g. Team Leader"
              value={form.displayName}
              onChange={(e) =>
                setForm((f) => ({ ...f, displayName: e.target.value }))
              }
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
              Description
            </label>
            <textarea
              rows={2}
              className="cs-input w-full resize-none"
              placeholder="Describe what this role can do…"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          {/* Color */}
          <div>
            <p className="mb-2 text-xs font-medium text-[rgba(26,26,26,0.6)]">
              Badge Color
            </p>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                >
                  {form.color === c && (
                    <Check className="mx-auto h-3.5 w-3.5 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions */}
          {categories.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.5)]">
                Permissions
                <span className="ml-2 text-[#C8A061]">
                  ({form.permissionIds.length} selected)
                </span>
              </p>
              <div className="space-y-2 rounded-lg border border-[#E3D4C2]">
                {categories.map((cat) => {
                  const perms = grouped[cat];
                  const expanded = expandedCategory === cat;
                  const selectedCount = perms.filter((p) =>
                    form.permissionIds.includes(p.id),
                  ).length;
                  return (
                    <div key={cat}>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCategory(expanded ? null : cat)
                        }
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-[#FAF7F3]"
                      >
                        <span className="text-sm font-medium capitalize text-[#1F1C18]">
                          {cat.replace(/_/g, " ")}
                        </span>
                        <div className="flex items-center gap-2">
                          {selectedCount > 0 && (
                            <span className="rounded-full bg-[#C8A061] px-2 py-0.5 text-[10px] font-bold text-white">
                              {selectedCount}/{perms.length}
                            </span>
                          )}
                          {expanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-[rgba(26,26,26,0.4)]" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-[rgba(26,26,26,0.4)]" />
                          )}
                        </div>
                      </button>
                      {expanded && (
                        <div className="border-t border-[#E3D4C2] px-4 pb-3 pt-2 space-y-1.5">
                          {perms.map((p) => (
                            <label
                              key={p.id}
                              className="flex cursor-pointer items-start gap-3"
                            >
                              <input
                                type="checkbox"
                                checked={form.permissionIds.includes(p.id)}
                                onChange={() => togglePerm(p.id)}
                                className="mt-0.5 h-4 w-4 accent-[#C8A061]"
                              />
                              <div>
                                <p className="text-sm font-medium text-[#1F1C18]">
                                  {p.displayName}
                                </p>
                                {p.description && (
                                  <p className="text-xs text-[rgba(26,26,26,0.45)]">
                                    {p.description}
                                  </p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[#E3D4C2] p-4">
          <button onClick={onClose} className="cs-btn-ghost px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="cs-btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            {saving && <Spinner size="sm" />}
            {initial?.id ? "Save Changes" : "Create Role"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assign user modal ─────────────────────────────────────────────────────────

interface AssignModalProps {
  roles: OrgRole[];
  members: OrgMember[];
  onClose: () => void;
  onAssign: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

function AssignModal({
  roles,
  members,
  onClose,
  onAssign,
  toast,
}: AssignModalProps) {
  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAssign = async () => {
    if (!userId || !roleId) {
      toast.error("Please select both a member and a role.");
      return;
    }
    setSaving(true);
    const res = await api.post(`/admin/roles/${roleId}/assign`, { userId });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Role assigned successfully.");
    onAssign();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E3D4C2] p-5">
          <h2 className="flex items-center gap-2 text-base font-bold text-[#1F1C18]">
            <UserCheck className="h-5 w-5 text-[#C8A061]" />
            Assign Role to Member
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[rgba(26,26,26,0.4)] hover:bg-[#F5EFE6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
              Member *
            </label>
            <select
              className="cs-input w-full"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">Select member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName} ({m.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
              Role *
            </label>
            <select
              className="cs-input w-full"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            >
              <option value="">Select role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#E3D4C2] p-4">
          <button onClick={onClose} className="cs-btn-ghost px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={saving}
            className="cs-btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            {saving && <Spinner size="sm" />} Assign Role
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const { toasts, toast, remove } = useToast();
  const {
    data: rolesData,
    loading: rolesLoading,
    refetch: refetchRoles,
  } = useApi<OrgRole[]>("/admin/roles");
  const { data: permsData } = useApi<PermissionsResponse>("/admin/permissions");
  const { data: membersData } = useApi<{ data: OrgMember[] }>("/admin/users");

  const [editingRole, setEditingRole] = useState<OrgRole | null | "new">(null);
  const [deletingRole, setDeletingRole] = useState<OrgRole | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [delConfirmName, setDelConfirmName] = useState("");

  const roles = rolesData ?? [];
  const members = membersData?.data ?? [];

  const handleSaved = useCallback(
    (role: OrgRole) => {
      toast.success(
        editingRole === "new"
          ? `Role "${role.displayName}" created.`
          : `Role "${role.displayName}" updated.`,
      );
      setEditingRole(null);
      refetchRoles?.();
    },
    [editingRole, toast, refetchRoles],
  );

  const handleDelete = async () => {
    if (!deletingRole) return;
    if (delConfirmName !== deletingRole.displayName) {
      toast.error("Role name does not match.");
      return;
    }
    const res = await api.delete(`/admin/roles/${deletingRole.id}`);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`Role "${deletingRole.displayName}" deleted.`);
    setDeletingRole(null);
    setDelConfirmName("");
    refetchRoles?.();
  };

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={remove} />

      <PageHeader
        title="Roles & Permissions"
        subtitle="Create custom roles and control what each team member can do"
      >
        <button
          onClick={() => setAssigning(true)}
          className="cs-btn-ghost flex items-center gap-2 text-sm"
        >
          <UserCheck className="h-4 w-4" /> Assign Role
        </button>
        <button
          onClick={() => setEditingRole("new")}
          className="cs-btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" /> New Role
        </button>
      </PageHeader>

      {rolesLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" className="text-[#C8A061]" />
        </div>
      ) : roles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E3D4C2] py-16 text-center">
          <Shield className="mb-3 h-10 w-10 text-[rgba(26,26,26,0.2)]" />
          <p className="text-sm font-medium text-[rgba(26,26,26,0.5)]">
            No roles yet
          </p>
          <p className="mt-1 text-xs text-[rgba(26,26,26,0.35)]">
            Create custom roles to control what team members can access
          </p>
          <button
            onClick={() => setEditingRole("new")}
            className="cs-btn-primary mt-4 text-sm"
          >
            Create first role
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <div key={role.id} className="cs-card p-5 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: role.color }}
                  />
                  <h3 className="text-sm font-bold text-[#1F1C18]">
                    {role.displayName}
                  </h3>
                  {role.isSystem && (
                    <span className="rounded-full bg-[rgba(26,26,26,0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[rgba(26,26,26,0.5)]">
                      System
                    </span>
                  )}
                </div>
                {!role.isSystem && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setEditingRole(role)}
                      className="rounded-lg p-1.5 text-[rgba(26,26,26,0.35)] hover:bg-[#F5EFE6] hover:text-[#1F1C18]"
                      title="Edit role"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingRole(role)}
                      className="rounded-lg p-1.5 text-[rgba(26,26,26,0.35)] hover:bg-[rgba(142,14,0,0.08)] hover:text-[#8E0E00]"
                      title="Delete role"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              {role.description && (
                <p className="text-xs text-[rgba(26,26,26,0.5)] leading-relaxed">
                  {role.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-[rgba(26,26,26,0.5)]">
                  <Users className="h-3.5 w-3.5" />
                  {role._count.organizationUsers} member
                  {role._count.organizationUsers !== 1 ? "s" : ""}
                </div>
                <div className="text-xs text-[rgba(26,26,26,0.4)]">
                  {role.permissions.length} permission
                  {role.permissions.length !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Permission chips */}
              {role.permissions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 4).map((rp) => (
                    <span
                      key={rp.permission.id}
                      className="rounded-full border border-[#E3D4C2] px-2 py-0.5 text-[10px] text-[rgba(26,26,26,0.55)]"
                    >
                      {rp.permission.displayName}
                    </span>
                  ))}
                  {role.permissions.length > 4 && (
                    <span className="rounded-full bg-[#F5EFE6] px-2 py-0.5 text-[10px] text-[rgba(26,26,26,0.45)]">
                      +{role.permissions.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {editingRole !== null && (
        <RoleFormModal
          initial={editingRole === "new" ? undefined : editingRole}
          permissions={permsData ?? null}
          onClose={() => setEditingRole(null)}
          onSave={handleSaved}
          toast={toast}
        />
      )}

      {/* Assign modal */}
      {assigning && (
        <AssignModal
          roles={roles}
          members={members}
          onClose={() => setAssigning(false)}
          onAssign={() => {
            setAssigning(false);
            refetchRoles?.();
          }}
          toast={toast}
        />
      )}

      {/* Delete confirmation */}
      {deletingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-[#8E0E00]">
              <Trash2 className="h-5 w-5" /> Delete Role
            </h2>
            <p className="mb-4 text-sm text-[rgba(26,26,26,0.65)]">
              This will permanently delete the{" "}
              <span className="font-semibold">{deletingRole.displayName}</span>{" "}
              role. Type the role name to confirm.
            </p>
            <input
              className="cs-input mb-4 w-full"
              placeholder={deletingRole.displayName}
              value={delConfirmName}
              onChange={(e) => setDelConfirmName(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setDeletingRole(null);
                  setDelConfirmName("");
                }}
                className="cs-btn-ghost px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={delConfirmName !== deletingRole.displayName}
                className="flex items-center gap-2 rounded-lg bg-[#8E0E00] px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
              >
                Delete Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
