"use client";
import { useState, useCallback } from "react";
import { PlusCircle, FileText, Tag, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import { formatDate, truncate } from "@/lib/utils";
import type { Template } from "@/lib/types";

export default function TemplatesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { toasts, toast, remove } = useToast();
  const { data, loading, error, refetch } = useApi<Template[]>("/templates");
  const templates = Array.isArray(data) ? data : [];

  const [form, setForm] = useState({
    name: "",
    subject: "",
    body: "",
    type: "email",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!form.name || !form.subject || !form.body) {
      toast.error("Name, subject and body are required.");
      return;
    }
    setSaving(true);
    const res = await api.post<Template>("/templates", {
      name: form.name,
      subject: form.subject,
      content: form.body,
      templateType: form.type.toUpperCase(),
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Template created.");
    setShowCreate(false);
    setForm({ name: "", subject: "", body: "", type: "email" });
    refetch();
  }, [form, toast, refetch]);

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Delete template "${name}"?`)) return;
      const res = await api.delete(`/templates/${id}`);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Template deleted.");
      refetch();
    },
    [toast, refetch],
  );

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
        title="Templates"
        subtitle="Reusable message templates"
        action={{
          label: "New Template",
          icon: PlusCircle,
          onClick: () => setShowCreate(true),
        }}
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner size="lg" className="text-[#C8A061]" />
        </div>
      ) : error ? (
        <p className="text-sm text-[#8E0E00]">{error}</p>
      ) : templates.length === 0 ? (
        <div className="cs-card flex h-40 flex-col items-center justify-center gap-3 text-[rgba(26,26,26,0.45)]">
          <FileText className="h-8 w-8" />
          <p className="text-sm">No templates yet — create your first one!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="cs-card flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F1C18]">
                  <FileText className="h-4 w-4 text-[#D4AF6A]" />
                </div>
                <button
                  onClick={() => handleDelete(t.id, t.name)}
                  className="text-[rgba(26,26,26,0.35)] hover:text-[#8E0E00]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div>
                <p className="font-semibold text-[#1F1C18]">{t.name}</p>
                <p className="mt-0.5 text-sm text-[rgba(26,26,26,0.55)]">
                  {t.subject}
                </p>
                <p className="mt-1 text-xs text-[rgba(26,26,26,0.4)]">
                  {truncate(t.body ?? t.content ?? "", 80)}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="flex items-center gap-1 rounded-full bg-[rgba(212,175,106,0.12)] px-2.5 py-0.5 text-[10px] font-medium text-[#C8A061]">
                  <Tag className="h-3 w-3" />
                  {t.type}
                </span>
                <span className="text-[10px] text-[rgba(26,26,26,0.35)]">
                  {formatDate(t.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="cs-card w-full max-w-lg space-y-4 p-6">
            <h2 className="text-lg font-semibold text-[#1F1C18]">
              New Template
            </h2>
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
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="push">Push</option>
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
                  className="cs-input w-full resize-none"
                  value={form.body}
                  onChange={field("body")}
                  placeholder="Template body — use {{name}}, {{org}} as placeholders"
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
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <Spinner size="sm" />} Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
