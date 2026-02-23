"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { api } from "@/lib/api-client";
import { Spinner } from "@/components/ui/Spinner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await api.post("/auth/password/forgot", { email });
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSent(true);
  }

  return (
    <div className="rounded-2xl bg-white shadow-[0_4px_32px_rgba(31,28,24,0.10)] ring-1 ring-[#E3D4C2] p-8">
      <Link
        href="/login"
        className="mb-6 flex items-center gap-1.5 text-sm text-[rgba(26,26,26,0.5)] hover:text-[#1F1C18] transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </Link>

      {sent ? (
        <div className="py-4 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(212,175,106,0.12)]">
            <Mail className="h-6 w-6 text-[#C8A061]" />
          </div>
          <h2 className="text-xl font-bold text-[#1F1C18]">Check your inbox</h2>
          <p className="mt-2 text-sm text-[rgba(26,26,26,0.55)] leading-relaxed">
            We sent a password reset link to{" "}
            <strong className="text-[#1F1C18]">{email}</strong>.<br />
            Follow the link in the email to set a new password.
          </p>
          <p className="mt-5 text-xs text-[rgba(26,26,26,0.4)]">
            Didn&#39;t receive it?{" "}
            <button
              onClick={() => {
                setSent(false);
              }}
              className="font-semibold text-[#C8A061] hover:underline"
            >
              Send again
            </button>
          </p>
        </div>
      ) : (
        <>
          <div className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight text-[#1F1C18]">
              Forgot your password?
            </h1>
            <p className="mt-1 text-sm text-[rgba(26,26,26,0.5)]">
              Enter your email and we&#39;ll send you a reset link.
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
                Email address
              </label>
              <input
                type="email"
                value={email}
                required
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[#E3D4C2] bg-[#FDFAF6] px-4 py-3 text-sm text-[#1F1C18] outline-none placeholder:text-[rgba(26,26,26,0.35)] transition focus:border-[#C8A061] focus:ring-2 focus:ring-[rgba(200,160,97,0.18)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F1C18] px-4 py-3 text-sm font-semibold text-[#D4AF6A] shadow-sm transition hover:bg-[#2a2520] active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <Spinner size="sm" className="text-[#D4AF6A]" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send reset link
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
