"use client";
import { useState, useCallback } from "react";
import {
  PlusCircle,
  Mail,
  MessageSquare,
  Smartphone,
  Bell,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  CalendarClock,
  ChevronRight,
  Users,
  UserCheck,
  UserX,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import { formatDate, truncate } from "@/lib/utils";
import type { Message, PaginatedResponse } from "@/lib/types";

// ─── Channels ────────────────────────────────────────────────────────────────
const CHANNELS = [
  {
    id: "EMAIL",
    label: "Email",
    icon: Mail,
    desc: "Send to member email addresses",
    color: "#3B82F6",
  },
  {
    id: "SMS",
    label: "SMS / Phone",
    icon: Smartphone,
    desc: "Text message to phone numbers",
    color: "#10B981",
  },
  {
    id: "PUSH",
    label: "WhatsApp",
    icon: MessageSquare,
    desc: "WhatsApp (stored numbers)",
    color: "#25D366",
  },
  {
    id: "IN_APP",
    label: "Push Notification",
    icon: Bell,
    desc: "In-app push notification",
    color: "#8B5CF6",
  },
] as const;
type ChannelId = (typeof CHANNELS)[number]["id"];

const RECIPIENT_GROUPS = [
  { id: "ALL", label: "All Members", icon: Users },
  { id: "ACTIVE", label: "Active Members", icon: UserCheck },
  { id: "INACTIVE", label: "Inactive Members", icon: UserX },
] as const;
type RecipientGroup = (typeof RECIPIENT_GROUPS)[number]["id"];

type StatusTab = "ALL" | "SENT" | "SCHEDULED" | "DRAFT" | "FAILED";
const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Drafts" },
  { id: "SCHEDULED", label: "Scheduled" },
  { id: "SENT", label: "Sent" },
  { id: "FAILED", label: "Failed" },
];

const STATUS_ICON: Record<string, React.ReactNode> = {
  SENT: <CheckCircle className="h-4 w-4 text-emerald-600" />,
  FAILED: <XCircle className="h-4 w-4 text-[#8E0E00]" />,
  PENDING: <Clock className="h-4 w-4 text-amber-500" />,
  SCHEDULED: <CalendarClock className="h-4 w-4 text-[#C8A061]" />,
  DRAFT: <FileText className="h-4 w-4 text-[rgba(26,26,26,0.35)]" />,
};
const CH_LABEL: Record<string, string> = {
  EMAIL: "Email",
  SMS: "SMS",
  PUSH: "WhatsApp",
  IN_APP: "Push",
};
const CH_COLOR: Record<string, string> = {
  EMAIL: "#3B82F6",
  SMS: "#10B981",
  PUSH: "#25D366",
  IN_APP: "#8B5CF6",
};
const DEFAULT_FORM = {
  subject: "",
  body: "",
  channel: "EMAIL" as ChannelId,
  recipientGroup: "ALL" as RecipientGroup,
  senderEmail: "",
  senderPhone: "",
  senderWhatsapp: "",
  senderName: "",
  scheduleEnabled: false,
  scheduledFor: "",
};

export default function MessagesPage() {
  const [statusTab, setStatusTab] = useState<StatusTab>("ALL");
  const [page, setPage] = useState(1);
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { toasts, toast, remove } = useToast();

  const statusParam = statusTab !== "ALL" ? `&status=${statusTab}` : "";
  const { data, loading, error, refetch } = useApi<PaginatedResponse<Message>>(
    `/messages?page=${page}&limit=20${statusParam}`,
  );
  const messages = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const field =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSend = useCallback(async () => {
    if (!form.subject.trim() || !form.body.trim()) {
      toast.error("Subject and body are required.");
      return;
    }
    if (form.scheduleEnabled && !form.scheduledFor) {
      toast.error("Pick a date and time to schedule.");
      return;
    }
    setSending(true);
    const ch = CHANNELS.find((c) => c.id === form.channel)!;
    const payload: Record<string, unknown> = {
      title: form.subject,
      content: form.body,
      messageType: form.channel,
      channelLabel: ch.label,
      recipientGroup: form.recipientGroup,
      ...(form.scheduleEnabled && form.scheduledFor
        ? { scheduledFor: new Date(form.scheduledFor).toISOString() }
        : {}),
      ...(form.senderName ? { senderName: form.senderName } : {}),
      ...(form.channel === "EMAIL" && form.senderEmail
        ? { senderEmail: form.senderEmail }
        : {}),
      ...(form.channel === "SMS" && form.senderPhone
        ? { senderPhone: form.senderPhone }
        : {}),
      ...(form.channel === "PUSH" && form.senderWhatsapp
        ? { senderWhatsapp: form.senderWhatsapp }
        : {}),
    };
    const res = await api.post(
      form.scheduleEnabled ? "/messages" : "/messages/send",
      payload,
    );
    setSending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(
      form.scheduleEnabled ? "Message scheduled." : "Message sent.",
    );
    setShowCompose(false);
    setForm(DEFAULT_FORM);
    setStep(1);
    refetch();
  }, [form, toast, refetch]);

  const openCompose = () => {
    setForm(DEFAULT_FORM);
    setStep(1);
    setShowCompose(true);
  };
  const closeCompose = () => {
    setShowCompose(false);
    setForm(DEFAULT_FORM);
    setStep(1);
  };
  const selCh = CHANNELS.find((c) => c.id === form.channel)!;
  const SelIcon = selCh.icon;

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={remove} />
      <PageHeader
        title="Messages"
        subtitle="Send and schedule communications across Email, SMS and WhatsApp"
        action={{ label: "Compose", icon: PlusCircle, onClick: openCompose }}
      />

      {/* Status tabs */}
      <div className="flex gap-0.5 border-b border-[#E3D4C2]">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setStatusTab(t.id);
              setPage(1);
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              statusTab === t.id
                ? "border-[#C8A061] text-[#1F1C18]"
                : "border-transparent text-[rgba(26,26,26,0.45)] hover:text-[#1F1C18]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Message list */}
      <div className="cs-card overflow-hidden p-0">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner size="lg" className="text-[#C8A061]" />
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-[#8E0E00]">{error}</p>
        ) : messages.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-[rgba(26,26,26,0.45)]">
            <Mail className="h-10 w-10" />
            <p className="text-sm font-medium">No messages yet</p>
            <button
              onClick={openCompose}
              className="cs-btn-primary mt-1 flex items-center gap-2 text-xs"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Compose your first message
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#E3D4C2]">
            {messages.map((m) => {
              const sk = m.status?.toUpperCase();
              const ck = m.messageType?.toUpperCase();
              const CIcon = CHANNELS.find((c) => c.id === ck)?.icon ?? Mail;
              return (
                <div
                  key={m.id}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-[rgba(212,175,106,0.04)]"
                >
                  <div className="mt-0.5 shrink-0">
                    {STATUS_ICON[sk] ?? (
                      <Mail className="h-4 w-4 text-[rgba(26,26,26,0.4)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[#1F1C18]">
                      {m.subject ?? m.title}
                    </p>
                    <p className="mt-0.5 text-sm text-[rgba(26,26,26,0.55)]">
                      {truncate(m.body ?? m.content ?? "", 100)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                      <span
                        className="flex items-center gap-1 rounded-full bg-[rgba(212,175,106,0.12)] px-2 py-0.5 text-[10px] font-medium"
                        style={{ color: CH_COLOR[ck] ?? "#C8A061" }}
                      >
                        <CIcon className="h-3 w-3" />
                        {CH_LABEL[ck] ?? m.messageType}
                      </span>
                      <span className="text-xs text-[rgba(26,26,26,0.4)]">
                        ·
                      </span>
                      <span className="text-xs text-[rgba(26,26,26,0.4)]">
                        {m.scheduledFor
                          ? `Scheduled ${formatDate(m.scheduledFor)}`
                          : `Created ${formatDate(m.createdAt)}`}
                      </span>
                      {!!m.recipientCount && (
                        <>
                          <span className="text-xs text-[rgba(26,26,26,0.4)]">
                            ·
                          </span>
                          <span className="text-xs text-[rgba(26,26,26,0.4)]">
                            {m.recipientCount} recipient
                            {m.recipientCount === 1 ? "" : "s"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                      sk === "SENT"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : sk === "SCHEDULED"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : sk === "FAILED"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-[#E3D4C2] text-[rgba(26,26,26,0.5)]"
                    }`}
                  >
                    {m.status?.toLowerCase()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

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

      {/* ── Compose Modal (3-step wizard) ─────────────────────────────────────── */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div className="cs-card w-full max-w-xl overflow-hidden p-0 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E3D4C2] bg-[#FAF7F3] px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#1F1C18]">
                  Compose Message
                </h2>
                <p className="text-xs text-[rgba(26,26,26,0.5)]">
                  Step {step} of 3 —{" "}
                  {step === 1
                    ? "Choose channel"
                    : step === 2
                      ? "Recipients & content"
                      : "Schedule & send"}
                </p>
              </div>
              <button
                onClick={closeCompose}
                className="rounded-lg p-1.5 text-[rgba(26,26,26,0.4)] hover:bg-[#E3D4C2]"
              >
                ✕
              </button>
            </div>
            {/* Progress */}
            <div className="flex">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-1 transition-colors ${step >= s ? "bg-[#C8A061]" : "bg-[#E3D4C2]"}`}
                />
              ))}
            </div>

            <div className="max-h-[68vh] overflow-y-auto p-6">
              {/* STEP 1 — Channel */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-[#1F1C18]">
                    Select a messaging channel
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {CHANNELS.map((ch) => {
                      const Icon = ch.icon;
                      const sel = form.channel === ch.id;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({ ...f, channel: ch.id }))
                          }
                          className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
                            sel
                              ? "border-[#C8A061] bg-[rgba(200,160,97,0.08)] ring-1 ring-[#C8A061]"
                              : "border-[#E3D4C2] bg-white hover:border-[#C8A061]/50"
                          }`}
                        >
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg ${sel ? "bg-[#1F1C18]" : "bg-[#F0E8DA]"}`}
                          >
                            <Icon
                              className="h-4 w-4"
                              style={{ color: sel ? ch.color : undefined }}
                            />
                          </div>
                          <div>
                            <p
                              className={`text-sm font-semibold ${sel ? "text-[#1F1C18]" : "text-[rgba(26,26,26,0.7)]"}`}
                            >
                              {ch.label}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-tight text-[rgba(26,26,26,0.45)]">
                              {ch.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2 — Recipients & Content */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 rounded-lg bg-[rgba(200,160,97,0.08)] px-3 py-2">
                    <SelIcon
                      className="h-4 w-4"
                      style={{ color: selCh.color }}
                    />
                    <span className="text-xs font-medium text-[rgba(26,26,26,0.6)]">
                      Channel: <strong>{selCh.label}</strong>
                    </span>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                      Sender name{" "}
                      <span className="text-[rgba(26,26,26,0.35)]">
                        (optional)
                      </span>
                    </label>
                    <input
                      className="cs-input w-full"
                      value={form.senderName}
                      onChange={field("senderName")}
                      placeholder="e.g. Pastor John / Church Office"
                    />
                  </div>
                  {form.channel === "EMAIL" && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                        Reply-to email{" "}
                        <span className="text-[rgba(26,26,26,0.35)]">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="email"
                        className="cs-input w-full"
                        value={form.senderEmail}
                        onChange={field("senderEmail")}
                        placeholder="noreply@yourorg.com"
                      />
                    </div>
                  )}
                  {form.channel === "SMS" && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                        From phone number{" "}
                        <span className="text-[rgba(26,26,26,0.35)]">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="tel"
                        className="cs-input w-full"
                        value={form.senderPhone}
                        onChange={field("senderPhone")}
                        placeholder="+1 555 000 0000"
                      />
                    </div>
                  )}
                  {form.channel === "PUSH" && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                        From WhatsApp number{" "}
                        <span className="text-[rgba(26,26,26,0.35)]">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="tel"
                        className="cs-input w-full"
                        value={form.senderWhatsapp}
                        onChange={field("senderWhatsapp")}
                        placeholder="+1 555 000 0000"
                      />
                    </div>
                  )}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                      Recipients
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {RECIPIENT_GROUPS.map((rg) => {
                        const Icon = rg.icon;
                        const sel = form.recipientGroup === rg.id;
                        return (
                          <button
                            key={rg.id}
                            type="button"
                            onClick={() =>
                              setForm((f) => ({ ...f, recipientGroup: rg.id }))
                            }
                            className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-center transition-all text-xs ${
                              sel
                                ? "border-[#C8A061] bg-[rgba(200,160,97,0.1)] font-semibold text-[#1F1C18]"
                                : "border-[#E3D4C2] text-[rgba(26,26,26,0.55)] hover:border-[#C8A061]/50"
                            }`}
                          >
                            <Icon
                              className={`h-4 w-4 ${sel ? "text-[#C8A061]" : ""}`}
                            />
                            {rg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                      {form.channel === "EMAIL" ? "Subject *" : "Title *"}
                    </label>
                    <input
                      className="cs-input w-full"
                      value={form.subject}
                      onChange={field("subject")}
                      placeholder={
                        form.channel === "EMAIL"
                          ? "Email subject line…"
                          : "Message title…"
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center justify-between text-xs font-medium text-[rgba(26,26,26,0.6)]">
                      <span>Message *</span>
                      {(form.channel === "SMS" || form.channel === "PUSH") && (
                        <span
                          className={`text-[10px] ${form.body.length > 160 ? "text-[#8E0E00]" : "text-[rgba(26,26,26,0.4)]"}`}
                        >
                          {form.body.length} chars
                          {form.channel === "SMS" &&
                            form.body.length > 0 &&
                            ` · ${Math.ceil(form.body.length / 160)} SMS`}
                        </span>
                      )}
                    </label>
                    <textarea
                      rows={form.channel === "EMAIL" ? 6 : 4}
                      className="cs-input w-full resize-none"
                      value={form.body}
                      onChange={field("body")}
                      placeholder={
                        form.channel === "EMAIL"
                          ? "Write your email content…\n\nUse {{firstName}}, {{orgName}} as placeholders."
                          : form.channel === "SMS"
                            ? "Write your SMS (160 chars/segment)…"
                            : "Write your WhatsApp message…"
                      }
                    />
                  </div>
                </div>
              )}

              {/* STEP 3 — Schedule & Review */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-[#E3D4C2] bg-[#FAF7F3] p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <SelIcon
                        className="h-4 w-4"
                        style={{ color: selCh.color }}
                      />
                      <span className="text-xs font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.55)]">
                        {selCh.label} ·{" "}
                        {
                          RECIPIENT_GROUPS.find(
                            (r) => r.id === form.recipientGroup,
                          )?.label
                        }
                      </span>
                    </div>
                    <p className="font-semibold text-[#1F1C18]">
                      {form.subject || (
                        <em className="text-[rgba(26,26,26,0.4)]">
                          (no subject)
                        </em>
                      )}
                    </p>
                    <p className="text-sm text-[rgba(26,26,26,0.6)]">
                      {truncate(form.body, 120) || (
                        <em className="text-[rgba(26,26,26,0.4)]">(no body)</em>
                      )}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={form.scheduleEnabled}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            scheduleEnabled: !f.scheduleEnabled,
                            scheduledFor: "",
                          }))
                        }
                        className={`relative h-6 w-10 rounded-full transition-colors ${form.scheduleEnabled ? "bg-[#C8A061]" : "bg-[#D4C9BC]"}`}
                      >
                        <span
                          className={`absolute top-[2px] h-5 w-5 rounded-full bg-white shadow transition-all ${form.scheduleEnabled ? "left-[18px]" : "left-[2px]"}`}
                        />
                      </button>
                      <div>
                        <p className="text-sm font-medium text-[#1F1C18]">
                          Schedule for later
                        </p>
                        <p className="text-xs text-[rgba(26,26,26,0.5)]">
                          Queue the message for a specific date and time
                        </p>
                      </div>
                    </div>
                    {form.scheduleEnabled && (
                      <div className="rounded-xl border border-[#C8A061]/40 bg-[rgba(200,160,97,0.05)] p-4">
                        <label className="mb-2 flex items-center gap-2 text-xs font-medium text-[rgba(26,26,26,0.6)]">
                          <CalendarClock className="h-3.5 w-3.5" /> Date &amp;
                          Time *
                        </label>
                        <input
                          type="datetime-local"
                          className="cs-input w-full"
                          value={form.scheduledFor}
                          min={new Date(Date.now() + 5 * 60000)
                            .toISOString()
                            .slice(0, 16)}
                          onChange={field("scheduledFor")}
                        />
                        {form.scheduledFor && (
                          <p className="mt-2 text-xs text-[rgba(26,26,26,0.5)]">
                            Will send{" "}
                            {new Date(form.scheduledFor).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {(form.channel === "SMS" || form.channel === "PUSH") && (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-medium">
                          {form.channel === "SMS"
                            ? "SMS provider required"
                            : "WhatsApp Business API required"}
                        </p>
                        <p className="mt-0.5 text-xs text-amber-700">
                          {form.channel === "SMS"
                            ? "Connect Twilio or a SIM800 gateway in Settings → Integrations to enable live delivery."
                            : "Connect your WhatsApp Business account in Settings → Integrations. Messages are queued until then."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[#E3D4C2] px-6 py-4">
              <button
                className="cs-btn-ghost text-sm"
                onClick={() =>
                  step > 1
                    ? setStep((s) => (s - 1) as 1 | 2 | 3)
                    : closeCompose()
                }
              >
                {step > 1 ? "← Back" : "Cancel"}
              </button>
              {step < 3 ? (
                <button
                  className="cs-btn-primary flex items-center gap-2"
                  onClick={() => {
                    if (
                      step === 2 &&
                      (!form.subject.trim() || !form.body.trim())
                    ) {
                      toast.error("Subject and body are required.");
                      return;
                    }
                    setStep((s) => (s + 1) as 2 | 3);
                  }}
                >
                  Continue →
                </button>
              ) : (
                <button
                  className="cs-btn-primary flex items-center gap-2"
                  onClick={handleSend}
                  disabled={sending}
                >
                  {sending ? (
                    <Spinner size="sm" />
                  ) : form.scheduleEnabled ? (
                    <CalendarClock className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {form.scheduleEnabled ? "Schedule Message" : "Send Now"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

