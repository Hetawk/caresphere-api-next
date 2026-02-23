"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  // Redirect to login if no token
  useEffect(() => {
    const token = localStorage.getItem("cs_token");
    if (!token) router.replace("/login");
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F3ED]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
