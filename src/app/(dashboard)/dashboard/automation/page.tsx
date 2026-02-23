"use client";
import { useState, useCallback } from "react";
import {
  Zap,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  Check,
  Pencil,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import { formatDate, truncate } from "@/lib/utils";
import type { AutomationRule } from "@/lib/types";

const TRIGGER_LABELS: Record<string, string> = {
  new_member: "New member joins",
  birthday: "Member birthday",
  anniversary: "Membership anniversary",
  inactive: "Member inactive",
  custom: "Custom trigger",
};

export default function AutomationPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { toasts, toast, remove } = useToast();
  const { data, loading, error, refetch } =
    useApi<AutomationRule[]>("/automation");
  const rules = Array.isArray(data) ? data : [];

  const [form, setForm] = useState({
    name: "",
    trigger: "new_member",
    action: "send_email",
    templateId: "",
    delayDays: "0",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  const handleToggle = useCallback(
    async (id: string, isActive: boolean) => {
      const res = await api.patch(`/automation/${id}`, { isActive: !isActive });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(isActive ? "Rule disabled." : "Rule enabled.");
      refetch();
    },
    [toast, refetch],
  );

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Delete rule "${name}"?`)) return;
      const res = await api.delete(`/automation/${id}`);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Automation rule deleted.");
      refetch();
    },
    [toast, refetch],
  );

  const handleCreate = useCallback(async () => {
    if (!form.name || !form.trigger) {
      toast.error("Name and trigger are required.");
      return;
    }
    setSaving(true);
    const res = await api.post<AutomationRule>("/automation", {
      ...form,
      delayDays: Number(form.delayDays),
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Automation rule created.");
    setShowCreate(false);
    setForm({
      name: "",
      trigger: "new_member",
      action: "send_email",
      templateId: "",
      delayDays: "0",
      description: "",
    });
    refetch();
  }, [form, toast, refetch]);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    trigger: "new_member",
    action: "send_email",
    templateId: "",
    delayDays: "0",
    description: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  const startEdit = useCallback((r: AutomationRule) => {
    setEditId(r.id);
    setEditForm({
      name: r.name,
      trigger: r.trigger ?? r.triggerType ?? "new_member",
      action: r.action,
      templateId: r.templateId ?? "",
      delayDays: String(r.delayDays ?? 0),
      description: r.description ?? "",
    });
    setShowCreate(false);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editId) return;
    setEditSaving(true);
    const res = await api.patch(`/automation/${editId}`, {
      ...editForm,
      delayDays: Number(editForm.delayDays),
    });
    setEditSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Rule updated.");
    setEditId(null);
    refetch();
  }, [editId, editForm, toast, refetch]);

  const eField =
    (k: keyof typeof editForm) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setEditForm((f) => ({ ...f, [k]: e.target.value }));

  const field =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={remove} />
      <PageHeader
        title="Automation"
        subtitle="Rules that trigger messages automatically"
        action={{
          label: showCreate ? "Cancel" : "New Rule",
          icon: showCreate ? X : PlusCircle,
          onClick: () => {
            setShowCreate((v) => !v);
            setEditId(null);
          },
        }}
      />

      {/* Inline create form */}
      {showCreate && (
        <div className="cs-card space-y-4 border-l-4 border-[#C8A061] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1F1C18]">
              New Automation Rule
            </h2>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded p-1 text-[rgba(26,26,26,0.4)] hover:bg-[#E3D4C2]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                Name *
              </label>
              <input
                className="cs-input w-full"
                value={form.name}
                onChange={field("name")}
                placeholder="e.g. Welcome new members"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                  Trigger *
                </label>
                <select
                  className="cs-input w-full"
                  value={form.trigger}
                  onChange={field("trigger")}
                >
                  {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                  Action
                </label>
                <select
                  className="cs-input w-full"
                  value={form.action}
                  onChange={field("action")}
                >
                  <option value="send_email">Send Email</option>
                  <option value="send_sms">Send SMS</option>
                  <option value="send_push">Send Push</option>
                  <option value="send_whatsapp">Send WhatsApp</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                  Delay (days)
                </label>
                <input
                  type="number"
                  min={0}
                  className="cs-input w-full"
                  value={form.delayDays}
                  onChange={field("delayDays")}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                  Template ID
                </label>
                <input
                  className="cs-input w-full"
                  value={form.templateId}
                  onChange={field("templateId")}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                Description
              </label>
              <textarea
                rows={3}
                className="cs-input w-full resize-none"
                value={form.description}
                onChange={field("description")}
                placeholder="Optional description"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              className="cs-btn-ghost"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
            <button
              className="cs-btn-primary flex items-center gap-2"
              onClick={handleCreate}
              disabled={saving}
            >
              {saving ? <Spinner size="sm" /> : <Check className="h-4 w-4" />}{" "}
              Create Rule
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner size="lg" className="text-[#C8A061]" />
        </div>
      ) : error ? (
        <p className="text-sm text-[#8E0E00]">{error}</p>
      ) : rules.length === 0 ? (
        <div className="cs-card flex h-40 flex-col items-center justify-center gap-3 text-[rgba(26,26,26,0.45)]">
          <Zap className="h-8 w-8" />
          <p className="text-sm">
            No automation rules yet — add your first above!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((r) => {
            const isEdit = editId === r.id;
            return (
              <div
                key={r.id}
                className={`cs-card overflow-hidden transition-all ${isEdit ? "ring-2 ring-[#C8A061]" : ""}`}
              >
                <div className="flex items-start gap-4 p-5">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${r.isActive ? "bg-[#1F1C18]" : "bg-[rgba(26,26,26,0.08)]"}`}
                  >
                    <Zap
                      className={`h-4 w-4 ${r.isActive ? "text-[#D4AF6A]" : "text-[rgba(26,26,26,0.35)]"}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#1F1C18]">{r.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${r.isActive ? "bg-emerald-50 text-emerald-700" : "bg-[rgba(26,26,26,0.06)] text-[rgba(26,26,26,0.4)]"}`}
                      >
                        {r.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {r.description && (
                      <p className="mt-0.5 text-sm text-[rgba(26,26,26,0.55)]">
                        {truncate(r.description, 80)}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-[rgba(26,26,26,0.4)]">
                      <span>
                        When:{" "}
                        <span className="text-[rgba(26,26,26,0.65)]">
                          {TRIGGER_LABELS[r.trigger] ?? r.trigger}
                        </span>
                      </span>
                      <span>·</span>
                      <span>
                        Action:{" "}
                        <span className="text-[rgba(26,26,26,0.65)] capitalize">
                          {r.action.replace(/_/g, " ")}
                        </span>
                      </span>
                      {r.delayDays > 0 && (
                        <>
                          <span>·</span>
                          <span>Delay: {r.delayDays}d</span>
                        </>
                      )}
                      <span>·</span>
                      <span>Created {formatDate(r.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggle(r.id, r.isActive)}
                      title={r.isActive ? "Disable" : "Enable"}
                    >
                      {r.isActive ? (
                        <ToggleRight className="h-6 w-6 text-[#C8A061]" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-[rgba(26,26,26,0.3)]" />
                      )}
                    </button>
                    <button
                      onClick={() => (isEdit ? setEditId(null) : startEdit(r))}
                      className={`rounded-lg p-1.5 transition-colors ${isEdit ? "bg-[#C8A061] text-white" : "text-[rgba(26,26,26,0.4)] hover:bg-[#F0E8DA]"}`}
                      title={isEdit ? "Cancel" : "Edit"}
                    >
                      {isEdit ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Pencil className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(r.id, r.name)}
                      className="rounded-lg p-1.5 text-[rgba(26,26,26,0.3)] hover:bg-red-50 hover:text-[#8E0E00]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Inline edit panel */}
                {isEdit && (
                  <div className="border-t border-[#C8A061]/40 bg-[rgba(200,160,97,0.04)] px-5 py-4 space-y-3">
                    <div className="grid gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                          Name *
                        </label>
                        <input
                          className="cs-input w-full"
                          value={editForm.name}
                          onChange={eField("name")}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                            Trigger
                          </label>
                          <select
                            className="cs-input w-full"
                            value={editForm.trigger}
                            onChange={eField("trigger")}
                          >
                            {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                            Action
                          </label>
                          <select
                            className="cs-input w-full"
                            value={editForm.action}
                            onChange={eField("action")}
                          >
                            <option value="send_email">Send Email</option>
                            <option value="send_sms">Send SMS</option>
                            <option value="send_push">Send Push</option>
                            <option value="send_whatsapp">Send WhatsApp</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                            Delay (days)
                          </label>
                          <input
                            type="number"
                            min={0}
                            className="cs-input w-full"
                            value={editForm.delayDays}
                            onChange={eField("delayDays")}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                            Template ID
                          </label>
                          <input
                            className="cs-input w-full"
                            value={editForm.templateId}
                            onChange={eField("templateId")}
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                          Description
                        </label>
                        <textarea
                          rows={2}
                          className="cs-input w-full resize-none"
                          value={editForm.description}
                          onChange={eField("description")}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        className="cs-btn-ghost"
                        onClick={() => setEditId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="cs-btn-primary flex items-center gap-2"
                        onClick={handleEditSave}
                        disabled={editSaving}
                      >
                        {editSaving ? (
                          <Spinner size="sm" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}{" "}
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
