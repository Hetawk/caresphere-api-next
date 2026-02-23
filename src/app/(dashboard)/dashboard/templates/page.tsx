"use client";
import { useState, useCallback } from "react";
import {
  PlusCircle,
  FileText,
  Tag,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
  X,
  Check,
  Globe,
  Building2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import { formatDate, truncate } from "@/lib/utils";
import type { Template } from "@/lib/types";

// Template as returned by the API (includes org-scoping fields)
type RichTemplate = Template & {
  organizationId?: string | null;
  isSystemTemplate?: boolean;
  _forked?: boolean;
};

export default function TemplatesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { toasts, toast, remove } = useToast();
  const { data, loading, error, refetch } =
    useApi<RichTemplate[]>("/templates");
  const [templates, setTemplates] = useState<RichTemplate[] | null>(null);
  const list: RichTemplate[] = templates ?? (Array.isArray(data) ? data : []);

  // Sync list when API data loads
  if (data && templates === null) setTemplates(Array.isArray(data) ? data : []);

  const [form, setForm] = useState({
    name: "",
    subject: "",
    body: "",
    type: "EMAIL",
  });
  const [saving, setSaving] = useState(false);

  // Per-card expand state
  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    subject: "",
    body: "",
    type: "EMAIL",
  });
  const [editSaving, setEditSaving] = useState(false);

  const isSystem = (t: RichTemplate) =>
    t.isSystemTemplate === true ||
    t.organizationId === null ||
    t.organizationId === undefined;

  const startEdit = useCallback((t: RichTemplate) => {
    setEditId(t.id);
    setViewId(null);
    setEditForm({
      name: t.name,
      subject: t.subject ?? "",
      body:
        (t as RichTemplate & { body?: string; content?: string }).body ??
        t.content ??
        "",
      type: t.type?.toUpperCase() ?? "EMAIL",
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name || !form.subject || !form.body) {
      toast.error("Name, subject and body are required.");
      return;
    }
    setSaving(true);
    const res = await api.post<RichTemplate>("/templates", {
      name: form.name,
      subject: form.subject,
      content: form.body,
      templateType: form.type,
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Template created.");
    setShowCreate(false);
    setForm({ name: "", subject: "", body: "", type: "EMAIL" });
    refetch();
    setTemplates(null);
  }, [form, toast, refetch]);

  const handleEditSave = useCallback(async () => {
    if (!editId) return;
    const tpl = list.find((t) => t.id === editId);
    setEditSaving(true);
    const res = await api.patch<RichTemplate & { _forked?: boolean }>(
      `/templates/${editId}`,
      {
        name: editForm.name,
        subject: editForm.subject,
        content: editForm.body,
        templateType: editForm.type,
      },
    );
    setEditSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    const saved = res.data!;
    if (saved._forked) {
      // System template was forked — replace the system card with the new org copy
      toast.success("Saved as your organization's copy.");
      setTemplates((prev) => {
        if (!prev) return prev;
        return [
          saved,
          ...prev.filter((t) => t.id !== editId), // keep system template in list too
        ];
      });
    } else {
      toast.success("Template updated.");
      setTemplates((prev) =>
        prev
          ? prev.map((t) => (t.id === editId ? { ...t, ...saved } : t))
          : prev,
      );
    }
    setEditId(null);
    if (tpl && isSystem(tpl)) {
      // Refresh so the system template is still visible alongside the new org copy
      refetch();
      setTemplates(null);
    }
  }, [editId, editForm, list, isSystem, toast, refetch]);

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      const tpl = list.find((t) => t.id === id);
      if (tpl && isSystem(tpl)) {
        toast.error(
          "System templates cannot be deleted. You can create your own copy by editing it.",
        );
        return;
      }
      if (!confirm(`Delete template \"${name}\"? This cannot be undone.`))
        return;
      const res = await api.delete(`/templates/${id}`);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Template deleted.");
      setTemplates((prev) => (prev ? prev.filter((t) => t.id !== id) : prev));
      if (viewId === id) setViewId(null);
      if (editId === id) setEditId(null);
    },
    [list, isSystem, viewId, editId, toast],
  );

  const field =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const eField =
    (k: keyof typeof editForm) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setEditForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={remove} />
      <PageHeader
        title="Templates"
        subtitle="Reusable message templates"
        action={{
          label: showCreate ? "Cancel" : "New Template",
          icon: showCreate ? X : PlusCircle,
          onClick: () => {
            setShowCreate((v) => !v);
            setEditId(null);
          },
        }}
      />

      {/* ── Inline create form ───────────────────────────────────────────────── */}
      {showCreate && (
        <div className="cs-card space-y-4 border-l-4 border-[#C8A061] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1F1C18]">
              New Template
            </h2>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded p-1 text-[rgba(26,26,26,0.4)] hover:bg-[#E3D4C2]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                  Name *
                </label>
                <input
                  className="cs-input w-full"
                  value={form.name}
                  onChange={field("name")}
                  placeholder="e.g. Welcome Email"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                  Type
                </label>
                <select
                  className="cs-input w-full"
                  value={form.type}
                  onChange={field("type")}
                >
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="PUSH">Push</option>
                  <option value="WHATSAPP">WhatsApp</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                  Subject *
                </label>
                <input
                  className="cs-input w-full"
                  value={form.subject}
                  onChange={field("subject")}
                  placeholder="Subject line…"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                Body *
              </label>
              <textarea
                rows={6}
                className="cs-input w-full resize-none font-mono text-sm"
                value={form.body}
                onChange={field("body")}
                placeholder="Template body — use {{name}}, {{org}} etc."
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
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Spinner size="sm" /> : <Check className="h-4 w-4" />}{" "}
              Save Template
            </button>
          </div>
        </div>
      )}

      {/* ── Template list ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner size="lg" className="text-[#C8A061]" />
        </div>
      ) : error ? (
        <p className="text-sm text-[#8E0E00]">{error}</p>
      ) : list.length === 0 ? (
        <div className="cs-card flex h-40 flex-col items-center justify-center gap-3 text-[rgba(26,26,26,0.45)]">
          <FileText className="h-8 w-8" />
          <p className="text-sm">No templates yet — create your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((t) => {
            const sys = isSystem(t);
            const body =
              (t as RichTemplate & { body?: string }).body ?? t.content ?? "";
            const isView = viewId === t.id;
            const isEdit = editId === t.id;
            return (
              <div
                key={t.id}
                className={`cs-card overflow-hidden transition-all ${
                  isEdit ? "ring-2 ring-[#C8A061]" : ""
                }`}
              >
                {/* ── Card header row ─────────────────────────────────────── */}
                <div className="flex items-start gap-4 p-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1F1C18]">
                    <FileText className="h-4 w-4 text-[#D4AF6A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#1F1C18]">{t.name}</p>
                      {sys ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          <Globe className="h-2.5 w-2.5" /> System template
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          <Building2 className="h-2.5 w-2.5" /> Your
                          organization
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-[rgba(26,26,26,0.55)]">
                      {t.subject}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[rgba(26,26,26,0.4)]">
                      <span className="flex items-center gap-1 rounded-full bg-[rgba(212,175,106,0.12)] px-2 py-0.5 font-medium text-[#C8A061]">
                        <Tag className="h-3 w-3" />
                        {t.type}
                      </span>
                      <span>{formatDate(t.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setViewId(isView ? null : t.id);
                        setEditId(null);
                      }}
                      className={`rounded-lg p-1.5 transition-colors ${
                        isView
                          ? "bg-[#1F1C18] text-[#D4AF6A]"
                          : "text-[rgba(26,26,26,0.4)] hover:bg-[#F0E8DA]"
                      }`}
                      title={isView ? "Hide body" : "View body"}
                    >
                      {isView ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => (isEdit ? setEditId(null) : startEdit(t))}
                      className={`rounded-lg p-1.5 transition-colors ${
                        isEdit
                          ? "bg-[#C8A061] text-white"
                          : "text-[rgba(26,26,26,0.4)] hover:bg-[#F0E8DA]"
                      }`}
                      title={
                        isEdit
                          ? "Cancel edit"
                          : sys
                            ? "Edit (creates your org copy)"
                            : "Edit template"
                      }
                    >
                      {isEdit ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Pencil className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(t.id, t.name)}
                      className={`rounded-lg p-1.5 transition-colors ${
                        sys
                          ? "cursor-not-allowed text-[rgba(26,26,26,0.2)]"
                          : "text-[rgba(26,26,26,0.3)] hover:bg-red-50 hover:text-[#8E0E00]"
                      }`}
                      title={
                        sys
                          ? "System templates cannot be deleted"
                          : "Delete template"
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* ── Inline view panel ────────────────────────────────────── */}
                {isView && !isEdit && (
                  <div className="border-t border-[#E3D4C2] bg-[#FAF7F3] px-5 py-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.4)]">
                        Body
                      </p>
                      <button
                        onClick={() => startEdit(t)}
                        className="flex items-center gap-1 text-xs text-[#C8A061] hover:underline"
                      >
                        <Pencil className="h-3 w-3" />
                        {sys
                          ? "Edit (saves as your org copy)"
                          : "Edit this template"}
                      </button>
                    </div>
                    {sys && (
                      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                        <Globe className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>
                          This is a <strong>system-level template</strong>{" "}
                          shared across the platform. Editing it will save a
                          private copy in your organization\'s space only — the
                          original will remain unchanged.
                        </p>
                      </div>
                    )}
                    <pre className="whitespace-pre-wrap rounded-lg border border-[#E3D4C2] bg-white p-4 font-mono text-sm text-[#1F1C18]">
                      {body}
                    </pre>
                  </div>
                )}

                {/* ── Inline edit panel ────────────────────────────────────── */}
                {isEdit && (
                  <div className="border-t border-[#C8A061]/40 bg-[rgba(200,160,97,0.04)] px-5 py-4 space-y-4">
                    {sys && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        <Globe className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>
                          You\'re editing a <strong>system template</strong>.
                          Your changes will be saved as a{" "}
                          <strong>private copy for your organization</strong> —
                          other organizations are not affected.
                        </p>
                      </div>
                    )}
                    <div className="grid gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                            Name *
                          </label>
                          <input
                            className="cs-input w-full"
                            value={editForm.name}
                            onChange={eField("name")}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                            Type
                          </label>
                          <select
                            className="cs-input w-full"
                            value={editForm.type}
                            onChange={eField("type")}
                          >
                            <option value="EMAIL">Email</option>
                            <option value="SMS">SMS</option>
                            <option value="PUSH">Push</option>
                            <option value="WHATSAPP">WhatsApp</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                            Subject
                          </label>
                          <input
                            className="cs-input w-full"
                            value={editForm.subject}
                            onChange={eField("subject")}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                          Body
                        </label>
                        <textarea
                          rows={8}
                          className="cs-input w-full resize-y font-mono text-sm"
                          value={editForm.body}
                          onChange={eField("body")}
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
                        )}
                        {sys ? "Save as my org copy" : "Save changes"}
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
