"use client";
import { useState, useCallback, useEffect } from "react";
import {
  Settings,
  Building2,
  Bell,
  User,
  Copy,
  Check,
  Church,
  Briefcase,
  Users2,
  BookOpen,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import type { Organization, OrganizationType } from "@/lib/types";

type Tab = "organization" | "notifications" | "profile";

const ORG_TYPES: {
  value: OrganizationType;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    value: "CHURCH",
    label: "Christian / Faith-based",
    desc: "Church, ministry, or faith community — Bible features enabled",
    icon: Church,
  },
  {
    value: "NONPROFIT",
    label: "Non-profit Organization",
    desc: "Charitable or community-focused non-profit",
    icon: Users2,
  },
  {
    value: "OTHER",
    label: "Company / Group",
    desc: "Business, club, or other organization",
    icon: Briefcase,
  },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("organization");
  const { toasts, toast, remove } = useToast();
  const { data: org, loading } = useApi<Organization>("/orgs/me");

  const [orgForm, setOrgForm] = useState({
    name: "",
    phone: "",
    address: "",
    website: "",
    description: "",
    organizationType: null as OrganizationType | null,
    bibleEnabled: false,
  });
  const [orgInitialized, setOrgInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  if (org && !orgInitialized) {
    setOrgForm({
      name: org.name ?? "",
      phone: org.phone ?? "",
      address: org.address ?? "",
      website: org.website ?? "",
      description: org.description ?? "",
      organizationType: (org.organizationType as OrganizationType) ?? null,
      bibleEnabled: org.bibleEnabled ?? false,
    });
    setOrgInitialized(true);
  }

  const handleCopyCode = useCallback(async () => {
    if (!org?.organizationCode) return;
    try {
      await navigator.clipboard.writeText(org.organizationCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }, [org?.organizationCode, toast]);

  const handleJoin = useCallback(async () => {
    if (!joinCode.trim()) {
      toast.error("Please enter a join code.");
      return;
    }
    setJoining(true);
    const res = await api.post("/orgs/join", {
      code: joinCode.trim().toUpperCase(),
    });
    setJoining(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Successfully joined the organization! Reloading…");
    setTimeout(() => window.location.reload(), 1200);
  }, [joinCode, toast]);

  const handleOrgTypeChange = (type: OrganizationType) => {
    setOrgForm((f) => ({
      ...f,
      organizationType: type,
      // Auto-enable Bible for CHURCH, auto-disable for others (user can override)
      bibleEnabled: type === "CHURCH" ? true : f.bibleEnabled,
    }));
  };

  const handleSaveOrg = useCallback(async () => {
    if (!orgForm.name.trim()) {
      toast.error("Organization name is required.");
      return;
    }
    if (!orgForm.organizationType) {
      toast.error("Please select an organization type.");
      return;
    }
    setSaving(true);
    const res = await api.patch("/orgs/me", orgForm);
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Organization settings saved.");
  }, [orgForm, toast]);

  const orgField =
    (k: keyof typeof orgForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setOrgForm((f) => ({ ...f, [k]: e.target.value }));

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "organization", label: "Organization", icon: Building2 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "profile", label: "My Profile", icon: User },
  ];

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={remove} />
      <PageHeader
        title="Settings"
        subtitle="Manage your organization preferences"
      />

      {/* Tab bar */}
      <div className="flex border-b border-[#E3D4C2]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-[#C8A061] text-[#1F1C18]"
                : "border-transparent text-[rgba(26,26,26,0.45)] hover:text-[#1F1C18]"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Organization tab */}
      {tab === "organization" && (
        <div className="max-w-2xl space-y-5">
          {/* ── Join Org card (only when user has no org) ────────────────── */}
          {!loading && !org && (
            <div className="cs-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0E8DA]">
                  <KeyRound className="h-5 w-5 text-[#C8A061]" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#1F1C18]">
                    Join an Organization
                  </h2>
                  <p className="text-xs text-[rgba(26,26,26,0.5)]">
                    You are not connected to any organization yet
                  </p>
                </div>
              </div>
              <p className="mb-4 text-sm text-[rgba(26,26,26,0.6)]">
                Ask your organization admin for the 7-character join code, then
                enter it below.
              </p>
              <div className="flex items-center gap-3">
                <input
                  className="cs-input flex-1 font-mono tracking-widest uppercase"
                  placeholder="e.g. ABC1234"
                  maxLength={7}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                />
                <button
                  onClick={handleJoin}
                  disabled={joining || joinCode.length < 4}
                  className="cs-btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {joining ? (
                    <Spinner size="sm" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  Join
                </button>
              </div>
            </div>
          )}

          <div className="cs-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.5)]">
              <Settings className="h-4 w-4" /> Organization Join Code
            </h2>
            <p className="mb-4 text-xs text-[rgba(26,26,26,0.55)]">
              Share this code with team members so they can join your
              organization.
            </p>
            {loading ? (
              <div className="h-12 animate-pulse rounded-lg bg-[#F5EFE6]" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-lg border border-[#E3D4C2] bg-[#FAF7F3] px-4 py-3">
                  <span className="font-mono text-xl font-bold tracking-[0.25em] text-[#1F1C18]">
                    {org?.organizationCode ?? "——"}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-2 rounded-lg border border-[#C8A061] bg-white px-4 py-3 text-sm font-medium text-[#1F1C18] transition-colors hover:bg-[#C8A061] hover:text-white"
                >
                  {codeCopied ? (
                    <>
                      <Check className="h-4 w-4" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Org Details */}
          <div className="cs-card space-y-5 p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.5)]">
              <Building2 className="h-4 w-4" /> Organization Details
            </h2>
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Spinner size="lg" className="text-[#C8A061]" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    k: "name",
                    label: "Organization Name *",
                    type: "text",
                    full: true,
                  },
                  { k: "phone", label: "Phone", type: "tel" },
                  { k: "website", label: "Website", type: "url" },
                  { k: "address", label: "Address", type: "text", full: true },
                ].map(({ k, label, type, full }) => (
                  <div key={k} className={full ? "col-span-2" : ""}>
                    <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                      {label}
                    </label>
                    <input
                      type={type}
                      className="cs-input w-full"
                      value={orgForm[k as keyof typeof orgForm] as string}
                      onChange={orgField(k as keyof typeof orgForm)}
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="cs-input w-full resize-none"
                    value={orgForm.description}
                    onChange={orgField("description")}
                    placeholder="Brief description of your organization…"
                  />
                </div>
              </div>
            )}

            {/* Organization Type */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.5)]">
                Organization Type
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {ORG_TYPES.map((opt) => {
                  const selected = orgForm.organizationType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleOrgTypeChange(opt.value)}
                      className={`relative flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all duration-150 ${
                        selected
                          ? "border-[#C8A061] bg-[rgba(200,160,97,0.08)] ring-1 ring-[#C8A061]"
                          : "border-[#E3D4C2] bg-white hover:border-[#C8A061]/50 hover:bg-[rgba(200,160,97,0.03)]"
                      }`}
                    >
                      {/* Selected checkmark */}
                      {selected && (
                        <span className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-[#C8A061]">
                          <Check
                            className="h-2.5 w-2.5 text-white"
                            strokeWidth={3}
                          />
                        </span>
                      )}
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                          selected ? "bg-[#1F1C18]" : "bg-[#F0E8DA]"
                        }`}
                      >
                        <opt.icon
                          className={`h-4 w-4 ${selected ? "text-[#D4AF6A]" : "text-[rgba(26,26,26,0.4)]"}`}
                        />
                      </div>
                      <span
                        className={`text-sm font-semibold ${selected ? "text-[#1F1C18]" : "text-[rgba(26,26,26,0.65)]"}`}
                      >
                        {opt.label}
                      </span>
                      <p className="text-[11px] leading-tight text-[rgba(26,26,26,0.45)]">
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bible Features — only visible for Christian / Faith-based orgs */}
            {orgForm.organizationType === "CHURCH" && (
              <div className="relative flex items-start gap-4 overflow-hidden rounded-xl border border-[#C8A061] bg-[rgba(200,160,97,0.07)] ring-1 ring-[#C8A061]/40 p-5">
                {/* Accent bar */}
                <span className="absolute left-0 inset-y-0 w-1 rounded-l-xl bg-[#C8A061]" />

                {/* Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1F1C18]">
                  <BookOpen className="h-5 w-5 text-[#D4AF6A]" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-[#1F1C18]">
                      Bible Features
                    </p>
                    <span className="inline-flex items-center rounded-full bg-[#C8A061]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#C8A061]">
                      Auto-on
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-[rgba(26,26,26,0.5)]">
                    Bible verse of the day, scripture scheduling, and devotional
                    content for your members.
                  </p>
                </div>

                {/* Toggle — always on for faith-based orgs */}
                <div className="flex shrink-0 flex-col items-end gap-1.5 pl-2">
                  <div className="relative h-7 w-[52px] rounded-full bg-[#C8A061] opacity-80">
                    <span className="absolute top-[3px] left-[27px] h-[22px] w-[22px] rounded-full bg-white shadow-md" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#C8A061]">
                    On
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                className="cs-btn-primary flex items-center gap-2"
                onClick={handleSaveOrg}
                disabled={saving || loading}
              >
                {saving && <Spinner size="sm" />} Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications tab */}
      {tab === "notifications" && (
        <div className="cs-card max-w-2xl space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.5)]">
            <Bell className="h-4 w-4" /> Notification Preferences
          </h2>
          {[
            {
              label: "Email digest",
              desc: "Receive a weekly summary of activity",
            },
            {
              label: "Message delivery alerts",
              desc: "Notify when bulk messages are delivered or fail",
            },
            {
              label: "New member alerts",
              desc: "Notify when a new member joins",
            },
            {
              label: "Automation failures",
              desc: "Notify when an automation rule fails",
            },
          ].map(({ label, desc }) => (
            <label
              key={label}
              className="flex cursor-pointer items-start gap-4"
            >
              <input
                type="checkbox"
                defaultChecked
                className="mt-0.5 h-4 w-4 accent-[#C8A061]"
              />
              <div>
                <p className="text-sm font-medium text-[#1F1C18]">{label}</p>
                <p className="text-xs text-[rgba(26,26,26,0.5)]">{desc}</p>
              </div>
            </label>
          ))}
          <div className="flex justify-end pt-2">
            <button
              className="cs-btn-primary"
              onClick={() => toast.success("Preferences saved.")}
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* Profile tab */}
      {tab === "profile" && (
        <div className="cs-card max-w-2xl space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.5)]">
            <User className="h-4 w-4" /> My Profile
          </h2>
          <ProfileForm toast={toast} />
        </div>
      )}
    </div>
  );
}

function ProfileForm({
  toast,
}: {
  toast: { success: (m: string) => void; error: (m: string) => void };
}) {
  // ── Profile info ──────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Password change ───────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // Load current user on mount
  useEffect(() => {
    api.get("/auth/profile").then((res) => {
      setLoadingProfile(false);
      if (!res.error && res.data) {
        const d = res.data as {
          firstName?: string;
          lastName?: string;
          phone?: string;
          email?: string;
        };
        setProfile({
          firstName: d.firstName ?? "",
          lastName: d.lastName ?? "",
          phone: d.phone ?? "",
          email: d.email ?? "",
        });
      }
    });
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const res = await api.patch("/auth/profile", {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone || undefined,
    });
    setSavingProfile(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Profile info updated.");
  };

  const handleSavePassword = async () => {
    if (!pwForm.currentPassword) {
      toast.error("Current password is required.");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setSavingPw(true);
    const res = await api.patch("/auth/password", {
      currentPassword: pwForm.currentPassword,
      newPassword: pwForm.newPassword,
    });
    setSavingPw(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    toast.success("Password changed successfully.");
  };

  const pf =
    (k: keyof typeof profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setProfile((prev) => ({ ...prev, [k]: e.target.value }));

  const pw =
    (k: keyof typeof pwForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setPwForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="space-y-8">
      {/* ── Profile Information ────────────────────────────────────────── */}
      <div>
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.4)]">
          Profile Information
        </p>
        {loadingProfile ? (
          <div className="flex h-24 items-center justify-center">
            <Spinner size="lg" className="text-[#C8A061]" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                First Name
              </label>
              <input
                className="cs-input w-full"
                value={profile.firstName}
                onChange={pf("firstName")}
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                Last Name
              </label>
              <input
                className="cs-input w-full"
                value={profile.lastName}
                onChange={pf("lastName")}
                autoComplete="family-name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                Phone
              </label>
              <input
                type="tel"
                className="cs-input w-full"
                value={profile.phone}
                onChange={pf("phone")}
                autoComplete="tel"
                placeholder="+1 555 000 0000"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
                Email
              </label>
              <input
                type="email"
                className="cs-input w-full cursor-not-allowed opacity-60"
                value={profile.email}
                readOnly
                tabIndex={-1}
                title="Email cannot be changed here"
              />
            </div>
            <div className="col-span-2 flex justify-end">
              <button
                className="cs-btn-primary flex items-center gap-2"
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile && <Spinner size="sm" />} Save Info
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Change Password ────────────────────────────────────────────── */}
      <div className="border-t border-[#E3D4C2] pt-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F1C18]">
            <Lock className="h-4 w-4 text-[#D4AF6A]" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.4)]">
            Change Password
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Current password — full width */}
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                className="cs-input w-full pr-10"
                value={pwForm.currentPassword}
                onChange={pw("currentPassword")}
                autoComplete="current-password"
                placeholder="Enter your current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(26,26,26,0.4)] hover:text-[#1F1C18]"
                tabIndex={-1}
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                className="cs-input w-full pr-10"
                value={pwForm.newPassword}
                onChange={pw("newPassword")}
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(26,26,26,0.4)] hover:text-[#1F1C18]"
                tabIndex={-1}
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                className={`cs-input w-full ${
                  pwForm.confirmPassword &&
                  pwForm.confirmPassword !== pwForm.newPassword
                    ? "border-red-400 ring-1 ring-red-300"
                    : pwForm.confirmPassword &&
                        pwForm.confirmPassword === pwForm.newPassword
                      ? "border-green-400 ring-1 ring-green-300"
                      : ""
                }`}
                value={pwForm.confirmPassword}
                onChange={pw("confirmPassword")}
                autoComplete="new-password"
                placeholder="Re-enter new password"
              />
              {pwForm.confirmPassword && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {pwForm.confirmPassword === pwForm.newPassword ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <span className="text-xs font-bold text-red-500">
                      &#x2717;
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          <div className="col-span-2 flex justify-end">
            <button
              className="cs-btn-primary flex items-center gap-2"
              onClick={handleSavePassword}
              disabled={
                savingPw ||
                !pwForm.currentPassword ||
                !pwForm.newPassword ||
                !pwForm.confirmPassword
              }
            >
              {savingPw && <Spinner size="sm" />} Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
