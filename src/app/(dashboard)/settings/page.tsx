"use client";
import { useState, useCallback } from "react";
import { Settings, Building2, Bell, User } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api-client";
import type { Organization } from "@/lib/types";

type Tab = "organization" | "notifications" | "profile";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("organization");
  const { toasts, toast, remove } = useToast();
  const { data: org, loading } = useApi<Organization>("/organizations/current");

  const [orgForm, setOrgForm] = useState({
    name: "",
    phone: "",
    address: "",
    website: "",
    description: "",
  });
  const [orgInitialized, setOrgInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  if (org && !orgInitialized) {
    setOrgForm({
      name: org.name ?? "",
      phone: org.phone ?? "",
      address: org.address ?? "",
      website: org.website ?? "",
      description: org.description ?? "",
    });
    setOrgInitialized(true);
  }

  const handleSaveOrg = useCallback(async () => {
    if (!orgForm.name) {
      toast.error("Organization name is required.");
      return;
    }
    setSaving(true);
    const res = await api.patch("/organizations/current", orgForm);
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
        <div className="cs-card max-w-2xl space-y-5 p-6">
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
                    value={orgForm[k as keyof typeof orgForm]}
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
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setSaving(true);
    const payload: Record<string, string> = {};
    if (form.firstName) payload.firstName = form.firstName;
    if (form.lastName) payload.lastName = form.lastName;
    if (form.newPassword && form.currentPassword) {
      payload.currentPassword = form.currentPassword;
      payload.newPassword = form.newPassword;
    }
    const res = await api.patch("/users/me", payload);
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Profile updated.");
  };

  const f =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
          First Name
        </label>
        <input
          className="cs-input w-full"
          value={form.firstName}
          onChange={f("firstName")}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
          Last Name
        </label>
        <input
          className="cs-input w-full"
          value={form.lastName}
          onChange={f("lastName")}
        />
      </div>
      <div className="col-span-2">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.4)]">
          Change Password
        </p>
      </div>
      <div className="col-span-2">
        <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
          Current Password
        </label>
        <input
          type="password"
          className="cs-input w-full"
          value={form.currentPassword}
          onChange={f("currentPassword")}
          autoComplete="current-password"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
          New Password
        </label>
        <input
          type="password"
          className="cs-input w-full"
          value={form.newPassword}
          onChange={f("newPassword")}
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[rgba(26,26,26,0.6)]">
          Confirm Password
        </label>
        <input
          type="password"
          className="cs-input w-full"
          value={form.confirmPassword}
          onChange={f("confirmPassword")}
          autoComplete="new-password"
        />
      </div>
      <div className="col-span-2 flex justify-end">
        <button
          className="cs-btn-primary flex items-center gap-2"
          onClick={handleSave}
          disabled={saving}
        >
          {saving && <Spinner size="sm" />} Save Profile
        </button>
      </div>
    </div>
  );
}
