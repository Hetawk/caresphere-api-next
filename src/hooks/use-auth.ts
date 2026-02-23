"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { AuthUser } from "@/lib/types";

const TOKEN_KEY = "cs_token";
const USER_KEY = "cs_user";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  /** Rehydrate from localStorage on mount */
  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const res = await api.post<{
        accessToken: string;
        refreshToken?: string;
        expiresIn?: string;
        user: AuthUser;
      }>("/auth/login", { email, password });
      if (res.error || !res.data) {
        return res.error ?? "Login failed. Please check your credentials.";
      }
      const token = res.data.accessToken;
      if (!token) return "Login failed — no token received.";
      localStorage.setItem(TOKEN_KEY, token);
      if (res.data.refreshToken) {
        localStorage.setItem("cs_refresh_token", res.data.refreshToken);
      }
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
      setUser(res.data.user);
      router.push("/dashboard");
      return null;
    },
    [router],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    router.push("/login");
  }, [router]);

  const isAdmin =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "ADMIN" ||
    user?.role === "KINGDOM_SUPER_ADMIN";
  const isKingdomAdmin = user?.role === "KINGDOM_SUPER_ADMIN";

  return { user, loading, login, logout, isAdmin, isKingdomAdmin };
}
