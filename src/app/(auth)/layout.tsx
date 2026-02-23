import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { Users, MessageSquare, Zap, Shield, BarChart3 } from "lucide-react";

export const metadata: Metadata = { title: "CareSphere" };

const FEATURES = [
  {
    icon: Users,
    title: "People Management",
    desc: "Keep every member of your organization connected and engaged.",
  },
  {
    icon: MessageSquare,
    title: "Smart Messaging",
    desc: "Personalized email, SMS and push notifications at scale.",
  },
  {
    icon: Zap,
    title: "Automation",
    desc: "Set-and-forget workflows that run entirely on autopilot.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    desc: "Actionable insights into the health of your organization.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    desc: "Role-based access controls and encrypted data at rest.",
  },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] flex-col justify-between bg-[#1F1C18] px-12 py-14 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#D4AF6A] opacity-[0.06] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-[#C8A061] opacity-[0.05] blur-3xl" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(212,175,106,0.12)] ring-1 ring-[rgba(212,175,106,0.2)]">
              <Image src="/logo.svg" alt="" width={28} height={28} priority />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#D4AF6A]">
              CareSphere
            </span>
          </div>
          <div className="mt-12">
            <h1 className="text-[2.4rem] font-bold leading-tight text-white">
              Manage your
              <br />
              organization
              <br />
              <span className="text-[#D4AF6A]">with intelligence.</span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[rgba(255,255,255,0.4)] max-w-xs">
              The all-in-one platform modern organizations use to connect,
              communicate and grow their communities.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(212,175,106,0.1)] ring-1 ring-[rgba(212,175,106,0.18)]">
                <Icon className="h-3.5 w-3.5 text-[#D4AF6A]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-[rgba(255,255,255,0.38)] leading-relaxed">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="relative z-10 text-[11px] text-[rgba(255,255,255,0.18)] italic">
          &ldquo;Every great organization starts with great connections.&rdquo;
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#F7F3ED] px-5 py-12 sm:px-10">
        <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1F1C18]">
            <Image src="/logo.svg" alt="CareSphere" width={34} height={34} />
          </div>
          <p className="text-lg font-bold text-[#1F1C18]">CareSphere</p>
        </div>
        <div className="w-full max-w-[420px]">{children}</div>
        <p className="mt-10 text-[11px] text-[rgba(26,26,26,0.3)]">
          &#169; {new Date().getFullYear()} CareSphere &#183; All rights
          reserved
        </p>
      </div>
    </div>
  );
}
