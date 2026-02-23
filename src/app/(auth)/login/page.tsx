"use client";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { Spinner } from "@/components/ui/Spinner";

export default function LoginPage() {
  const { login } = useAuth();
  const { toasts, toast, remove } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    const err = await login(email, password);
    setLoading(false);
    if (err) setError(err);
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={remove} />

      <div className="rounded-2xl bg-white shadow-[0_4px_32px_rgba(31,28,24,0.10)] ring-1 ring-[#E3D4C2] p-8">
        <div className="mb-7">
          <h1 className="text-2xl font-bold tracking-tight text-[#1F1C18]">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-[rgba(26,26,26,0.5)]">
            Sign in to your CareSphere account
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
              autoComplete="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[#E3D4C2] bg-[#FDFAF6] px-4 py-3 text-sm text-[#1F1C18] outline-none placeholder:text-[rgba(26,26,26,0.35)] transition focus:border-[#C8A061] focus:ring-2 focus:ring-[rgba(200,160,97,0.18)]"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-[#1F1C18]">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[#C8A061] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
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
                <LogIn className="h-4 w-4" />
                Sign in
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[rgba(26,26,26,0.5)]">
          Don&#39;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#C8A061] hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </>
  );
}
