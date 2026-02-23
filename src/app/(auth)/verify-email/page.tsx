"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Mail, ArrowLeft, CheckCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { Spinner } from "@/components/ui/Spinner";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const email = params.get("email") ?? "";
  const flow = params.get("flow") ?? ""; // "register" → complete signup

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Prevent auto-submit loop: only fire once per completed code entry
  const autoSubmittedRef = useRef(false);

  // countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const code = digits.join("");

  const handleDigit = (i: number, value: string) => {
    const v = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < CODE_LENGTH - 1) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = [...digits];
    pasted.split("").forEach((c, i) => {
      next[i] = c;
    });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    e.preventDefault();
  };

  const handleVerify = useCallback(async () => {
    if (code.length < CODE_LENGTH) {
      setError("Please enter all 6 digits.");
      return;
    }
    setError("");
    setLoading(true);

    if (flow === "register") {
      // Complete registration: read stored form data from sessionStorage
      let regData: Record<string, unknown> = {};
      try {
        const raw = sessionStorage.getItem("cs_reg_payload");
        if (raw) regData = JSON.parse(raw);
      } catch {
        /* ignore */
      }
      const useOrgRoute =
        regData.organizationAction && regData.organizationAction !== "skip";
      const endpoint = useOrgRoute ? "/auth/register-org" : "/auth/register";
      const payload = useOrgRoute
        ? { ...regData, code }
        : {
            firstName: regData.firstName,
            lastName: regData.lastName,
            email: regData.email,
            password: regData.password,
            code,
          };
      const res = await api.post(endpoint, payload);
      setLoading(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      sessionStorage.removeItem("cs_reg_payload");
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } else {
      // Plain email verification (existing users)
      const res = await api.post("/auth/verify-email", { email, code });
      setLoading(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    }
  }, [code, email, flow, router]);

  // auto-submit when all digits filled — only once per completed entry
  useEffect(() => {
    if (code.length < CODE_LENGTH) {
      autoSubmittedRef.current = false;
      return;
    }
    if (!success && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      handleVerify();
    }
  }, [code, success, handleVerify]);

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError("");
    const res = await api.post("/auth/resend-verification", { email });
    setResending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setCountdown(RESEND_COOLDOWN);
    setDigits(Array(CODE_LENGTH).fill(""));
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="rounded-2xl bg-white shadow-[0_4px_32px_rgba(31,28,24,0.10)] ring-1 ring-[#E3D4C2] p-8">
      <Link
        href="/register"
        className="mb-6 flex items-center gap-1.5 text-sm text-[rgba(26,26,26,0.5)] hover:text-[#1F1C18] transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to register
      </Link>

      {success ? (
        <div className="py-4 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-[#1F1C18]">
            {flow === "register" ? "Account created!" : "Email verified!"}
          </h2>
          <p className="mt-2 text-sm text-[rgba(26,26,26,0.5)]">
            {flow === "register"
              ? "Welcome to CareSphere. Redirecting you to sign in…"
              : "Redirecting you to sign in…"}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(212,175,106,0.1)]">
              <Mail className="h-6 w-6 text-[#C8A061]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1F1C18]">
              Verify your email
            </h1>
            <p className="mt-2 text-sm text-[rgba(26,26,26,0.5)] leading-relaxed">
              {flow === "register"
                ? "Almost there! We sent a 6-digit code to"
                : "We sent a 6-digit code to"}
              <br />
              <strong className="text-[#1F1C18]">
                {email || "your email"}
              </strong>
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

          {/* OTP input */}
          <div
            className="flex justify-center gap-2.5 mb-6"
            onPaste={handlePaste}
          >
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`h-13 w-11 rounded-xl border text-center text-xl font-bold text-[#1F1C18] outline-none transition
                  ${d ? "border-[#C8A061] bg-[rgba(212,175,106,0.08)]" : "border-[#E3D4C2] bg-[#FDFAF6]"}
                  focus:border-[#C8A061] focus:ring-2 focus:ring-[rgba(200,160,97,0.18)]`}
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || code.length < CODE_LENGTH}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F1C18] px-4 py-3 text-sm font-semibold text-[#D4AF6A] shadow-sm transition hover:bg-[#2a2520] active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <Spinner size="sm" className="text-[#D4AF6A]" />
            ) : flow === "register" ? (
              "Verify & create account"
            ) : (
              "Verify email"
            )}
          </button>

          {/* Resend */}
          <div className="mt-5 text-center text-sm text-[rgba(26,26,26,0.5)]">
            Didn&#39;t receive a code?{" "}
            {countdown > 0 ? (
              <span className="text-[rgba(26,26,26,0.4)]">
                Resend in {countdown}s
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-1 font-semibold text-[#C8A061] hover:underline disabled:opacity-50"
              >
                {resending ? (
                  <>
                    <Spinner size="sm" className="text-[#C8A061]" />
                    Resending…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Resend code
                  </>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl bg-white shadow-[0_4px_32px_rgba(31,28,24,0.10)] ring-1 ring-[#E3D4C2] p-8 flex items-center justify-center min-h-[320px]">
          <Spinner size="lg" className="text-[#C8A061]" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
