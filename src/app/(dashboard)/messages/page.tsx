"use client";
import { useState, useCallback } from "react";
import { PlusCircle, Mail, Clock, CheckCircle, XCircle, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import { formatDate, truncate } from "@/lib/utils";
import type { Message, PaginatedResponse } from "@/lib/types";

const STATUS_ICON: Record<string, React.ReactNode> = {
  sent:      <CheckCircle className="h-4 w-4 text-emerald-600" />,
  failed:    <XCircle className="h-4 w-4 text-[#8E0E00]" />,
  pending:   <Clock className="h-4 w-4 text-amber-500" />,
  scheduled: <Clock className="h-4 w-4 text-[#C8A061]" />,
};

export default function MessagesPage() {
  const [showCompose, setShowCompose] = useState(false);
  const [page, setPage] = useState(1);
  const { toasts, toast, remove } = useToast();
  const { data, loading, error, refetch } = useApi<PaginatedResponse<Message>>(
    `/messages?page=${page}&limit=20`
  );

  const messages = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const [form, setForm] = useState({
    subject: "", body: "", messageType: "email", recipientType: "all",
    scheduledFor: "",
  });
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!form.subject || !form.body) {
      toast.error("Subject and message body are required.");
      return;
    }
    setSending(true);
    const res = await api.post<Message>("/messages", form);
    setSending(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Message sent successfully.");
    setShowCompose(false);
    setForm({ subject:"", body:"", messageType:"email", recipientType:"all", scheduledFor:"" });
    refetch();
  }, [form, toast, refetch]);

  const field = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={remove} />
      <PageHeader
        title="Messages"
        subtitle="Sent and scheduled communications"
        action={{ label: "Compose", icon: PlusCircle, onClick: () => setShowCompose(true) }}
      />

      <div className="cs-card overflow-hidden p-0">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner size="lg" className="text-[#C8A061]" />
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-[#8E0E00]">{error}</p>
        ) : messages.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-[rgba(26,26,26,0.45)]">
            <Mail className="h-8 w-8" />
            <p className="text-sm">No messages yet — compose one!</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E3D4C2]">
            {messages.map((m) => (
              <div key={m.id} className="flex items-start gap-4 px-6 py-4 hover:bg-[rgba(212,175,106,0.04)]">
                <div className="mt-0.5 shrink-0">
                  {STATUS_ICON[m.status] ?? <Mail className="h-4 w-4 text-[rgba(26,26,26,0.4)]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#1F1C18] truncate">{m.subject}</p>
                  <p className="mt-0.5 text-sm text-[rgba(26,26,26,0.55)]">{truncate(m.body ?? m.content ?? "", 100)}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-[rgba(26,26,26,0.4)]">
                    <span className="capitalize">{m.messageType}</span>
                    <span>·</span>
                    <span>Sent {formatDate(m.createdAt)}</span>
                    {m.recipientCount != null && <><span>·</span><span>{m.recipientCount} recipient{m.recipientCount === 1 ? "" : "s"}</span></>}
                  </div>
                </div>
                <span className="mt-0.5 shrink-0 rounded-full border border-[#E3D4C2] px-2 py-0.5 text-[10px] font-medium capitalize text-[rgba(26,26,26,0.5)]">
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[rgba(26,26,26,0.5)]">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page<=1} onClick={() => setPage(p => p-1)} className="cs-btn-ghost px-3 py-1.5 text-xs disabled:opacity-40">Previous</button>
            <button disabled={page>=totalPages} onClick={() => setPage(p => p+1)} className="cs-btn-ghost px-3 py-1.5 text-xs disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="cs-card w-full max-w-lg space-y-4 p-6">
            <h2 className="text-lg font-semibold text-[#1F1C18]">Compose Message</h2>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">Subject *</label>
                <input className="cs-input w-full" value={form.subject} onChange={field("subject")} placeholder="Message subject…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">Type</label>
                  <select className="cs-input w-full" value={form.messageType} onChange={field("messageType")}>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="push">Push</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">Recipients</label>
                  <select className="cs-input w-full" value={form.recipientType} onChange={field("recipientType")}>
                    <option value="all">All Members</option>
                    <option value="active">Active Members</option>
                    <option value="inactive">Inactive Members</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">Body *</label>
                <textarea
                  rows={5}
                  className="cs-input w-full resize-none"
                  value={form.body}
                  onChange={field("body")}
                  placeholder="Write your message here…"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">Schedule (optional)</label>
                <input type="datetime-local" className="cs-input w-full" value={form.scheduledFor} onChange={field("scheduledFor")} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button className="cs-btn-ghost" onClick={() => setShowCompose(false)}>Cancel</button>
              <button className="cs-btn-primary flex items-center gap-2" onClick={handleSend} disabled={sending}>
                {sending ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
                {form.scheduledFor ? "Schedule" : "Send Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
