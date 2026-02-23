"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import { Spinner } from "@/components/ui/Spinner";

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
            className={`h-1 flex-1 rounded-full transition-all ${i <= score ? colors[score] : "bg-[#E3D4C2]"}`}
          />
        ))}
      </div>
      <span className="text-[11px] font-medium text-[rgba(26,26,26,0.5)]">
        {labels[score]}
      </span>
    </div>
  );
}

function ResetPasswordContent() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!email || !token)
      setError("Invalid or expired reset link. Please request a new one.");
  }, [email, token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const res = await api.post("/auth/password/reset", {
      email,
      token,
      newPassword: password,
    });
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/login"), 2500);
  }

  return (
    <div className="rounded-2xl bg-white shadow-[0_4px_32px_rgba(31,28,24,0.10)] ring-1 ring-[#E3D4C2] p-8">
      <Link
        href="/login"
        className="mb-6 flex items-center gap-1.5 text-sm text-[rgba(26,26,26,0.5)] hover:text-[#1F1C18] transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </Link>

      {success ? (
        <div className="py-4 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-[#1F1C18]">
            Password updated!
          </h2>
          <p className="mt-2 text-sm text-[rgba(26,26,26,0.55)]">
            Redirecting you to sign in…
          </p>
        </div>
      ) : (
        <>
          <div className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight text-[#1F1C18]">
              Set new password
            </h1>
            <p className="mt-1 text-sm text-[rgba(26,26,26,0.5)]">
              Choose a strong password for your account.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-[rgba(142,14,0,0.06)] px-4 py-3 text-sm text-[#8E0E00] ring-1 ring-[rgba(142,14,0,0.15)]">
              <span className="mt-px shrink-0 text-base leading-none">
                &#9888;
              </span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1F1C18]">
                New password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-[#E3D4C2] bg-[#FDFAF6] px-4 py-3 pr-11 text-sm text-[#1F1C18] outline-none placeholder:text-[rgba(26,26,26,0.35)] transition focus:border-[#C8A061] focus:ring-2 focus:ring-[rgba(200,160,97,0.18)]"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[rgba(26,26,26,0.4)] hover:text-[#1F1C18]"
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1F1C18]">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConf ? "text" : "password"}
                  value={confirm}
                  required
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-[#E3D4C2] bg-[#FDFAF6] px-4 py-3 pr-11 text-sm text-[#1F1C18] outline-none placeholder:text-[rgba(26,26,26,0.35)] transition focus:border-[#C8A061] focus:ring-2 focus:ring-[rgba(200,160,97,0.18)]"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConf((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[rgba(26,26,26,0.4)] hover:text-[#1F1C18]"
                >
                  {showConf ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !token}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F1C18] px-4 py-3 text-sm font-semibold text-[#D4AF6A] shadow-sm transition hover:bg-[#2a2520] active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <Spinner size="sm" className="text-[#D4AF6A]" />
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Update password
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl bg-white shadow-[0_4px_32px_rgba(31,28,24,0.10)] ring-1 ring-[#E3D4C2] p-8 flex items-center justify-center min-h-[320px]">
          <Spinner size="lg" className="text-[#C8A061]" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
