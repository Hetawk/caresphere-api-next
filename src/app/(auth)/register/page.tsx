"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  UserPlus,
  Building2,
  Users,
  ArrowRight,
  ArrowLeft,
  Hash,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Spinner } from "@/components/ui/Spinner";
import { useRouter } from "next/navigation";

const INPUT =
  "w-full rounded-xl border border-[#E3D4C2] bg-[#FDFAF6] px-4 py-2.5 text-sm text-[#1F1C18] outline-none placeholder:text-[rgba(26,26,26,0.35)] transition focus:border-[#C8A061] focus:ring-2 focus:ring-[rgba(200,160,97,0.18)]";

function PasswordStrength({ password }: { password: string }) {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) =>
    r.test(password),
  ).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "bg-[#E3D4C2]",
    "bg-[#8E0E00]",
    "bg-amber-500",
    "bg-[#C8A061]",
    "bg-emerald-600",
  ];
  if (!password) return null;
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : "bg-[#E3D4C2]"}`}
          />
        ))}
      </div>
      <span className="text-[11px] font-medium text-[rgba(26,26,26,0.5)]">
        {labels[score]}
      </span>
    </div>
  );
}

type OrgAction = "create" | "join" | "skip";

const ORG_OPTIONS: {
  value: OrgAction;
  icon: React.ElementType;
  title: string;
  desc: string;
}[] = [
  {
    value: "create",
    icon: Building2,
    title: "Create a new organization",
    desc: "Set up your org and become the admin.",
  },
  {
    value: "join",
    icon: Users,
    title: "Join an existing organization",
    desc: "Enter the invite code your admin gave you.",
  },
  {
    value: "skip",
    icon: ArrowRight,
    title: "Skip for now",
    desc: "You can create or join an org later in Settings.",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* Step 1 — personal info */
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  /* Step 2 — org */
  const [orgAction, setOrgAction] = useState<OrgAction>("create");
  const [orgName, setOrgName] = useState("");
  const [orgCode, setOrgCode] = useState("");

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  /* ── Step 1 validation → go to step 2 ── */
  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setStep(2);
  }

  /* ── Step 2 submit: send OTP then redirect to verify-email ── */
  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (orgAction === "create" && !orgName.trim()) {
      setError("Please enter your organization name.");
      return;
    }
    if (orgAction === "join" && !orgCode.trim()) {
      setError("Please enter the organization invite code.");
      return;
    }
    setLoading(true);
    /* Send OTP to email */
    const otpRes = await api.post("/auth/verify", { email: form.email });
    if (otpRes.error) {
      setError(otpRes.error);
      setLoading(false);
      return;
    }

    /* Store registration data in sessionStorage for verify-email to use */
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password,
      organizationAction: orgAction,
      ...(orgAction === "create" ? { organizationName: orgName.trim() } : {}),
      ...(orgAction === "join"
        ? { organizationCode: orgCode.trim().toUpperCase() }
        : {}),
    };
    sessionStorage.setItem("cs_reg_payload", JSON.stringify(payload));
    setLoading(false);
    router.push(
      `/verify-email?email=${encodeURIComponent(form.email)}&flow=register`,
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-[0_4px_32px_rgba(31,28,24,0.10)] ring-1 ring-[#E3D4C2] p-8">
      {/* Progress bar */}
      <div className="mb-6 flex items-center gap-3">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                step === s
                  ? "bg-[#1F1C18] text-[#D4AF6A]"
                  : step > s
                    ? "bg-[#C8A061] text-white"
                    : "bg-[#E3D4C2] text-[rgba(26,26,26,0.4)]"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
            <span
              className={`text-xs font-medium ${step === s ? "text-[#1F1C18]" : "text-[rgba(26,26,26,0.4)]"}`}
            >
              {s === 1 ? "Your details" : "Organization"}
            </span>
            {s < 2 && <div className="h-px w-6 bg-[#E3D4C2]" />}
          </div>
        ))}
      </div>

      {/* ─── STEP 1 ─── */}
      {step === 1 && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-[#1F1C18]">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-[rgba(26,26,26,0.5)]">
              Get your organization on CareSphere in minutes
            </p>
          </div>

          {error && <ErrorBanner msg={error} />}

          <form onSubmit={handleStep1} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(["firstName", "lastName"] as const).map((k) => (
                <div key={k}>
                  <label className="mb-1.5 block text-sm font-medium text-[#1F1C18]">
                    {k === "firstName" ? "First name" : "Last name"}
                  </label>
                  <input
                    type="text"
                    value={form[k]}
                    required
                    onChange={set(k)}
                    placeholder={k === "firstName" ? "Jane" : "Smith"}
                    className={INPUT}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1F1C18]">
                Email address
              </label>
              <input
                type="email"
                value={form.email}
                required
                autoComplete="email"
                onChange={set("email")}
                placeholder="you@example.com"
                className={INPUT}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1F1C18]">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  required
                  onChange={set("password")}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  className={`${INPUT} pr-11`}
                />
                <ToggleEye
                  show={showPass}
                  onToggle={() => setShowPass((v) => !v)}
                />
              </div>
              <PasswordStrength password={form.password} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1F1C18]">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  required
                  onChange={set("confirmPassword")}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  className={`${INPUT} pr-11`}
                />
                <ToggleEye
                  show={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                />
              </div>
              {form.confirmPassword && (
                <p
                  className={`mt-1 text-[11px] font-medium ${form.password === form.confirmPassword ? "text-emerald-600" : "text-[#8E0E00]"}`}
                >
                  {form.password === form.confirmPassword
                    ? "✓ Passwords match"
                    : "✗ Passwords do not match"}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F1C18] px-4 py-3 text-sm font-semibold text-[#D4AF6A] shadow-sm transition hover:bg-[#2a2520] active:scale-[0.98]"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[rgba(26,26,26,0.5)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#C8A061] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </>
      )}

      {/* ─── STEP 2 ─── */}
      {step === 2 && (
        <>
          <button
            onClick={() => {
              setStep(1);
              setError("");
            }}
            className="mb-5 flex items-center gap-1.5 text-sm text-[rgba(26,26,26,0.5)] hover:text-[#1F1C18] transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>

          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-[#1F1C18]">
              Set up your organization
            </h1>
            <p className="mt-1 text-sm text-[rgba(26,26,26,0.5)]">
              Connect to an organization or skip — you can always do this later.
            </p>
          </div>

          {error && <ErrorBanner msg={error} />}

          <form onSubmit={handleStep2} className="space-y-3">
            {/* Radio cards */}
            {ORG_OPTIONS.map(({ value, icon: Icon, title, desc }) => (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all ${
                  orgAction === value
                    ? "border-[#C8A061] bg-[rgba(200,160,97,0.06)] ring-1 ring-[rgba(200,160,97,0.25)]"
                    : "border-[#E3D4C2] hover:border-[rgba(200,160,97,0.4)]"
                }`}
              >
                <input
                  type="radio"
                  name="orgAction"
                  value={value}
                  checked={orgAction === value}
                  onChange={() => setOrgAction(value)}
                  className="sr-only"
                />
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    orgAction === value
                      ? "bg-[#1F1C18]"
                      : "bg-[rgba(26,26,26,0.06)]"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${orgAction === value ? "text-[#D4AF6A]" : "text-[rgba(26,26,26,0.4)]"}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#1F1C18]">
                    {title}
                  </p>
                  <p className="text-xs text-[rgba(26,26,26,0.5)]">{desc}</p>
                </div>
                <div
                  className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 transition-all ${
                    orgAction === value
                      ? "border-[#C8A061] bg-[#C8A061]"
                      : "border-[#E3D4C2]"
                  }`}
                />
              </label>
            ))}

            {/* Conditional extra input */}
            {orgAction === "create" && (
              <div className="pt-1">
                <label className="mb-1.5 block text-sm font-medium text-[#1F1C18]">
                  Organization name
                </label>
                <input
                  type="text"
                  value={orgName}
                  autoFocus
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Corp, City FC, First Baptist…"
                  className={INPUT}
                />
                <p className="mt-1.5 text-[11px] text-[rgba(26,26,26,0.45)]">
                  You&apos;ll be the admin. Share the generated code with
                  members so they can join.
                </p>
              </div>
            )}

            {orgAction === "join" && (
              <div className="pt-1">
                <label className="mb-1.5 block text-sm font-medium text-[#1F1C18]">
                  Organization invite code
                </label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(26,26,26,0.35)]" />
                  <input
                    type="text"
                    value={orgCode}
                    autoFocus
                    maxLength={12}
                    onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ABC123"
                    className={`${INPUT} pl-10 font-mono tracking-widest uppercase`}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-[rgba(26,26,26,0.45)]">
                  Ask your organization admin for the invite code.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F1C18] px-4 py-3 text-sm font-semibold text-[#D4AF6A] shadow-sm transition hover:bg-[#2a2520] active:scale-[0.98] disabled:opacity-60 mt-2"
            >
              {loading ? (
                <Spinner size="sm" className="text-[#D4AF6A]" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create account &amp; verify email
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[rgba(26,26,26,0.5)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#C8A061] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

function ToggleEye({
  show,
  onToggle,
}: {
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onToggle}
      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[rgba(26,26,26,0.4)] hover:text-[#1F1C18]"
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-[rgba(142,14,0,0.06)] px-4 py-3 text-sm text-[#8E0E00] ring-1 ring-[rgba(142,14,0,0.15)]">
      <span className="mt-px shrink-0 text-base leading-none">⚠</span>
      {msg}
    </div>
  );
}
