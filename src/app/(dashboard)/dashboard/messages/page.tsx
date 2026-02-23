"use client";
import { useState, useCallback, useEffect, useRef } from "react";
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
  Search,
  Upload,
  X as XIcon,
  FileSpreadsheet,
  User,
  LayoutTemplate,
  ChevronDown,
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
type RecipientMode = "group" | "specific" | "csv";

// ─── Additional types ────────────────────────────────────────────────────────
type OrgTemplate = {
  id: string;
  name: string;
  subject?: string | null;
  body?: string | null;
  content?: string | null;
  isSystemTemplate?: boolean;
  organizationId?: string | null;
};
type MemberHit = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
};
type CsvContact = { name?: string; email?: string; phone?: string };

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
  const [statusTab,  setStatusTab]  = useState<StatusTab>("ALL");
  const [page,       setPage]       = useState(1);
  const [showCompose,setShowCompose]= useState(false);
  const [form,       setForm]       = useState(DEFAULT_FORM);
  const [sending,    setSending]    = useState(false);
  const [step,       setStep]       = useState<1 | 2 | 3>(1);
  const { toasts, toast, remove }   = useToast();

  // ── New: recipient mode & member search
  const [recipientMode,  setRecipientMode]  = useState<RecipientMode>("group");
  const [selectedMembers,setSelectedMembers]= useState<MemberHit[]>([]);
  const [memberQuery,    setMemberQuery]    = useState("");
  const [memberResults,  setMemberResults]  = useState<MemberHit[]>([]);
  const [searchingMem,   setSearchingMem]   = useState(false);
  const [showMemDrop,    setShowMemDrop]    = useState(false);
  const memberTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memberInputRef = useRef<HTMLInputElement>(null);

  // ── New: CSV / Excel upload
  const [csvContacts, setCsvContacts] = useState<CsvContact[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvError,    setCsvError]    = useState<string | null>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  // ── New: template picker
  const [showTplPicker, setShowTplPicker] = useState(false);
  const [orgTemplates,  setOrgTemplates]  = useState<OrgTemplate[]>([]);
  const [tplLoading,    setTplLoading]    = useState(false);

  // ── Template fetch (on picker open) ──────────────────────────────────────
  useEffect(() => {
    if (!showTplPicker || orgTemplates.length > 0) return;
    setTplLoading(true);
    api.get<{ items?: OrgTemplate[] } | OrgTemplate[]>("/templates").then((res) => {
      setTplLoading(false);
      if (res.error) return;
      const raw = res.data;
      const items: OrgTemplate[] = Array.isArray(raw)
        ? (raw as OrgTemplate[])
        : ((raw as { items?: OrgTemplate[] })?.items ?? []);
      setOrgTemplates(items);
    });
  }, [showTplPicker, orgTemplates.length]);

  // ── Member search (debounced) ─────────────────────────────────────────────
  useEffect(() => {
    if (memberQuery.trim().length < 2) {
      setMemberResults([]);
      setShowMemDrop(false);
      return;
    }
    if (memberTimerRef.current) clearTimeout(memberTimerRef.current);
    memberTimerRef.current = setTimeout(async () => {
      setSearchingMem(true);
      const res = await api.get<{ items?: MemberHit[] } | MemberHit[]>(
        `/members?search=${encodeURIComponent(memberQuery.trim())}&limit=10`,
      );
      setSearchingMem(false);
      if (!res.error) {
        const raw = res.data;
        const list: MemberHit[] = Array.isArray(raw)
          ? (raw as MemberHit[])
          : ((raw as { items?: MemberHit[] })?.items ?? []);
        setMemberResults(list.filter((m) => !selectedMembers.find((s) => s.id === m.id)));
        setShowMemDrop(true);
      }
    }, 350);
  }, [memberQuery, selectedMembers]);

  // ── CSV / Excel parser ────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    setCsvError(null);
    setCsvContacts([]);
    setCsvFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      const Papa = (await import("papaparse")).default;
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const contacts: CsvContact[] = results.data.map((row) => {
            const keys = Object.keys(row).map((k) => k.toLowerCase());
            const get = (terms: string[]) => {
              const k = keys.find((k) => terms.some((t) => k.includes(t)));
              return k ? row[Object.keys(row)[keys.indexOf(k)]]?.trim() || undefined : undefined;
            };
            return { name: get(["name","full"]), email: get(["email","e-mail","mail"]), phone: get(["phone","mobile","tel","cell"]) };
          }).filter((c) => c.email || c.phone);
          if (!contacts.length) setCsvError("No valid contacts found. Ensure the file has email or phone columns.");
          setCsvContacts(contacts);
        },
        error: () => setCsvError("Failed to parse CSV file."),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const XLSX = await import("xlsx");
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { type: "array" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
      const contacts: CsvContact[] = rows.map((row) => {
        const keys = Object.keys(row).map((k) => k.toLowerCase());
        const get = (terms: string[]) => {
          const k = keys.find((k) => terms.some((t) => k.includes(t)));
          return k ? String(row[Object.keys(row)[keys.indexOf(k)]])?.trim() || undefined : undefined;
        };
        return { name: get(["name","full"]), email: get(["email","e-mail","mail"]), phone: get(["phone","mobile","tel","cell"]) };
      }).filter((c) => c.email || c.phone);
      if (!contacts.length) setCsvError("No valid contacts found. Ensure the sheet has email or phone columns.");
      setCsvContacts(contacts);
    } else {
      setCsvError("Unsupported file type. Please upload a .csv, .xlsx or .xls file.");
    }
  }, []);

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

  // ── Member helpers ────────────────────────────────────────────────────────
  const memberLabel = (m: MemberHit) =>
    m.name ??
    ([m.firstName, m.lastName].filter(Boolean).join(" ") ||
      m.email ||
      m.phone ||
      m.id);
  const addMember = (m: MemberHit) => {
    setSelectedMembers((s) => [...s, m]);
    setMemberQuery(""); setMemberResults([]); setShowMemDrop(false);
    memberInputRef.current?.focus();
  };
  const removeMember = (id: string) => setSelectedMembers((s) => s.filter((m) => m.id !== id));

  // ── Template helpers ──────────────────────────────────────────────────────
  const applyTemplate = (t: OrgTemplate) => {
    setForm((f) => ({ ...f, subject: t.subject ?? f.subject, body: t.body ?? t.content ?? f.body }));
    setShowTplPicker(false);
  };

  // ── Recipient summary for Step 3 review ──────────────────────────────────
  const recipientSummary = () => {
    if (recipientMode === "specific")
      return `${selectedMembers.length} specific member${selectedMembers.length === 1 ? "" : "s"}`;
    if (recipientMode === "csv")
      return `${csvContacts.length} contact${csvContacts.length === 1 ? "" : "s"} from file`;
    return RECIPIENT_GROUPS.find((r) => r.id === form.recipientGroup)?.label ?? "All Members";
  };

  const handleSend = useCallback(async () => {
    if (!form.subject.trim() || !form.body.trim()) {
      toast.error("Subject and body are required.");
      return;
    }
    if (recipientMode === "specific" && selectedMembers.length === 0) {
      toast.error("Select at least one member.");
      return;
    }
    if (recipientMode === "csv" && csvContacts.length === 0) {
      toast.error("Upload a CSV/Excel file with at least one contact.");
      return;
    }
    if (form.scheduleEnabled && !form.scheduledFor) {
      toast.error("Pick a date and time to schedule.");
      return;
    }
    setSending(true);
    const ch = CHANNELS.find((c) => c.id === form.channel)!;
    const payload: Record<string, unknown> = {
      title:        form.subject,
      content:      form.body,
      messageType:  form.channel,
      channelLabel: ch.label,
      ...(form.scheduleEnabled && form.scheduledFor
        ? { scheduledFor: new Date(form.scheduledFor).toISOString() }
        : {}),
      ...(form.senderName ? { senderName: form.senderName } : {}),
      ...(form.channel === "EMAIL" && form.senderEmail ? { senderEmail: form.senderEmail } : {}),
      ...(form.channel === "SMS"   && form.senderPhone ? { senderPhone: form.senderPhone } : {}),
      ...(form.channel === "PUSH"  && form.senderWhatsapp ? { senderWhatsapp: form.senderWhatsapp } : {}),
    };
    if (recipientMode === "group") {
      payload.recipientGroup = form.recipientGroup;
    } else if (recipientMode === "specific") {
      payload.recipientMemberIds = selectedMembers.map((m) => m.id);
    } else {
      // csv — pass emails as recipientEmails; add fallback recipientGroup
      payload.recipientEmails = csvContacts.map((c) => c.email).filter(Boolean);
      payload.recipientGroup  = "ALL";
    }
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
    resetCompose();
    refetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, recipientMode, selectedMembers, csvContacts, toast, refetch]);

  const resetCompose = () => {
    setForm(DEFAULT_FORM);
    setStep(1);
    setRecipientMode("group");
    setSelectedMembers([]);
    setMemberQuery("");
    setCsvContacts([]);
    setCsvFileName(null);
    setCsvError(null);
    setShowTplPicker(false);
    setOrgTemplates([]);
  };
  const openCompose  = () => { resetCompose(); setShowCompose(true); };
  const closeCompose = () => { setShowCompose(false); resetCompose(); };
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
                <XIcon className="h-4 w-4" />
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
                  {/* ── Recipients ─────────────────────────────────────────── */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-[rgba(26,26,26,0.6)]">Recipients</label>

                    {/* Mode tabs */}
                    <div className="mb-3 flex overflow-hidden rounded-xl border border-[#E3D4C2]">
                      {(["group","specific","csv"] as RecipientMode[]).map((mode) => {
                        const labels: Record<RecipientMode, string> = { group: "Member Group", specific: "Specific Members", csv: "Upload File" };
                        const icons: Record<RecipientMode, React.ReactNode> = {
                          group:    <Users           className="h-3.5 w-3.5" />,
                          specific: <User            className="h-3.5 w-3.5" />,
                          csv:      <FileSpreadsheet className="h-3.5 w-3.5" />,
                        };
                        const active = recipientMode === mode;
                        return (
                          <button key={mode} type="button" onClick={() => setRecipientMode(mode)}
                            className={`flex flex-1 items-center justify-center gap-1.5 border-r py-2 text-[11px] font-medium last:border-r-0 border-[#E3D4C2] transition-colors ${
                              active ? "bg-[#1F1C18] text-white" : "bg-white text-[rgba(26,26,26,0.55)] hover:bg-[#FAF7F3]"
                            }`}>
                            {icons[mode]}{labels[mode]}
                          </button>
                        );
                      })}
                    </div>

                    {/* group mode */}
                    {recipientMode === "group" && (
                      <div className="grid grid-cols-3 gap-2">
                        {RECIPIENT_GROUPS.map((rg) => {
                          const Icon = rg.icon;
                          const sel  = form.recipientGroup === rg.id;
                          return (
                            <button key={rg.id} type="button"
                              onClick={() => setForm((f) => ({ ...f, recipientGroup: rg.id }))}
                              className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-center transition-all text-xs ${
                                sel
                                  ? "border-[#C8A061] bg-[rgba(200,160,97,0.1)] font-semibold text-[#1F1C18]"
                                  : "border-[#E3D4C2] text-[rgba(26,26,26,0.55)] hover:border-[#C8A061]/50"
                              }`}>
                              <Icon className={`h-4 w-4 ${sel ? "text-[#C8A061]" : ""}`} />
                              {rg.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* specific member mode */}
                    {recipientMode === "specific" && (
                      <div className="space-y-2">
                        {selectedMembers.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedMembers.map((m) => (
                              <span key={m.id} className="flex items-center gap-1 rounded-full border border-[#C8A061]/30 bg-[rgba(200,160,97,0.12)] px-2.5 py-1 text-xs text-[#1F1C18]">
                                {memberLabel(m)}
                                <button type="button" onClick={() => removeMember(m.id)} className="ml-0.5 text-[rgba(26,26,26,0.4)] hover:text-[#8E0E00]">
                                  <XIcon className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgba(26,26,26,0.35)]" />
                          <input ref={memberInputRef} className="cs-input w-full pl-8"
                            placeholder="Search by name or email…"
                            value={memberQuery}
                            onChange={(e) => setMemberQuery(e.target.value)}
                            onFocus={() => memberResults.length > 0 && setShowMemDrop(true)}
                            onBlur={() => setTimeout(() => setShowMemDrop(false), 200)}
                          />
                          {searchingMem && <Spinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C8A061]" />}
                          {showMemDrop && memberResults.length > 0 && (
                            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-[#E3D4C2] bg-white shadow-lg">
                              {memberResults.map((m) => (
                                <button key={m.id} type="button" onMouseDown={() => addMember(m)}
                                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-[#FAF7F3]">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F0E8DA] text-xs font-bold text-[#C8A061]">
                                    {(m.firstName?.[0] ?? m.name?.[0] ?? "?").toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-medium leading-none text-[#1F1C18]">{memberLabel(m)}</p>
                                    {m.email && <p className="mt-0.5 text-[11px] text-[rgba(26,26,26,0.45)]">{m.email}</p>}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {showMemDrop && !memberResults.length && memberQuery.trim().length >= 2 && !searchingMem && (
                            <div className="absolute z-20 mt-1 w-full rounded-xl border border-[#E3D4C2] bg-white px-4 py-3 text-sm text-[rgba(26,26,26,0.5)] shadow-lg">
                              No members found matching &ldquo;{memberQuery}&rdquo;
                            </div>
                          )}
                        </div>
                        {!selectedMembers.length && (
                          <p className="text-[11px] text-[rgba(26,26,26,0.4)]">Type at least 2 characters to search…</p>
                        )}
                      </div>
                    )}

                    {/* CSV / Excel upload mode */}
                    {recipientMode === "csv" && (
                      <div className="space-y-3">
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#C8A061]/40 bg-[rgba(200,160,97,0.04)] px-4 py-6 text-center transition-colors hover:border-[#C8A061] hover:bg-[rgba(200,160,97,0.08)]"
                        >
                          <Upload className="h-8 w-8 text-[#C8A061]" />
                          <div>
                            <p className="text-sm font-medium text-[#1F1C18]">
                              {csvFileName ?? "Click or drag & drop a file here"}
                            </p>
                            <p className="mt-0.5 text-[11px] text-[rgba(26,26,26,0.45)]">Supports .csv, .xlsx, .xls</p>
                          </div>
                          {csvFileName && csvContacts.length > 0 && (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                              {csvContacts.length} contact{csvContacts.length === 1 ? "" : "s"} ready
                            </span>
                          )}
                        </div>
                        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                        {csvError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-[#8E0E00]">{csvError}</p>}
                        {csvContacts.length > 0 && (
                          <div className="overflow-hidden rounded-xl border border-[#E3D4C2]">
                            <div className="flex gap-4 bg-[#FAF7F3] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.5)]">
                              <span className="w-28">Name</span><span className="flex-1">Email</span><span className="w-24">Phone</span>
                            </div>
                            <div className="max-h-36 divide-y divide-[#E3D4C2] overflow-y-auto">
                              {csvContacts.slice(0, 50).map((c, i) => (
                                <div key={i} className="flex gap-4 px-3 py-1.5 text-xs hover:bg-[rgba(212,175,106,0.04)]">
                                  <span className="w-28 truncate text-[rgba(26,26,26,0.7)]">{c.name ?? "—"}</span>
                                  <span className="flex-1 truncate text-[#1F1C18]">{c.email ?? "—"}</span>
                                  <span className="w-24 truncate text-[rgba(26,26,26,0.7)]">{c.phone ?? "—"}</span>
                                </div>
                              ))}
                              {csvContacts.length > 50 && (
                                <p className="px-3 py-1.5 text-xs text-[rgba(26,26,26,0.4)]">…and {csvContacts.length - 50} more</p>
                              )}
                            </div>
                          </div>
                        )}
                        <p className="text-[11px] text-[rgba(26,26,26,0.45)]">
                          Tip: include columns named{" "}
                          <code className="rounded bg-[#F0E8DA] px-1">name</code>,{" "}
                          <code className="rounded bg-[#F0E8DA] px-1">email</code> and{" "}
                          <code className="rounded bg-[#F0E8DA] px-1">phone</code> in any order.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ── Template picker ─────────────────────────────────────── */}
                  <div>
                    <button type="button" onClick={() => setShowTplPicker((v) => !v)}
                      className="flex w-full items-center justify-between rounded-xl border border-dashed border-[#C8A061]/40 bg-[rgba(200,160,97,0.04)] px-4 py-3 text-left transition-colors hover:border-[#C8A061] hover:bg-[rgba(200,160,97,0.08)]">
                      <div className="flex items-center gap-2.5">
                        <LayoutTemplate className="h-4 w-4 text-[#C8A061]" />
                        <div>
                          <p className="text-sm font-medium text-[#1F1C18]">Load from template</p>
                          <p className="text-[11px] text-[rgba(26,26,26,0.45)]">Auto-fill subject &amp; body from a saved template</p>
                        </div>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-[rgba(26,26,26,0.35)] transition-transform ${showTplPicker ? "rotate-180" : ""}`} />
                    </button>
                    {showTplPicker && (
                      <div className="mt-2 overflow-hidden rounded-xl border border-[#E3D4C2]">
                        {tplLoading ? (
                          <div className="flex h-20 items-center justify-center"><Spinner size="sm" className="text-[#C8A061]" /></div>
                        ) : orgTemplates.length === 0 ? (
                          <p className="px-4 py-4 text-sm text-[rgba(26,26,26,0.45)]">No templates saved yet.</p>
                        ) : (
                          <div className="max-h-48 divide-y divide-[#E3D4C2] overflow-y-auto">
                            {orgTemplates.map((t) => (
                              <button key={t.id} type="button" onClick={() => applyTemplate(t)}
                                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#FAF7F3]">
                                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#C8A061]" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-medium text-[#1F1C18]">{t.name}</p>
                                    {t.isSystemTemplate && !t.organizationId && (
                                      <span className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Platform</span>
                                    )}
                                    {t.organizationId && (
                                      <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Yours</span>
                                    )}
                                  </div>
                                  {t.subject && <p className="mt-0.5 truncate text-[11px] text-[rgba(26,26,26,0.45)]">{t.subject}</p>}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Subject ─────────────────────────────────────────────── */}
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
                        {selCh.label} · {recipientSummary()}
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
                    {recipientMode === "specific" && selectedMembers.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {selectedMembers.slice(0, 6).map((m) => (
                          <span key={m.id} className="rounded-full bg-[rgba(200,160,97,0.15)] px-2 py-0.5 text-[10px] text-[#1F1C18]">
                            {memberLabel(m)}
                          </span>
                        ))}
                        {selectedMembers.length > 6 && (
                          <span className="rounded-full bg-[rgba(200,160,97,0.15)] px-2 py-0.5 text-[10px] text-[rgba(26,26,26,0.5)]">
                            +{selectedMembers.length - 6} more
                          </span>
                        )}
                      </div>
                    )}
                    {recipientMode === "csv" && csvFileName && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-[#C8A061]" />
                        <span className="text-xs text-[rgba(26,26,26,0.55)]">
                          {csvFileName} — {csvContacts.length} contacts
                        </span>
                      </div>
                    )}
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
                    if (step === 2 && recipientMode === "specific" && selectedMembers.length === 0) {
                      toast.error("Select at least one member.");
                      return;
                    }
                    if (step === 2 && recipientMode === "csv" && csvContacts.length === 0) {
                      toast.error("Upload a file with at least one contact.");
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

