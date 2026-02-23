"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api-client";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Simple data-fetching hook.
 * Re-fetches whenever `path` changes.
 * Pass `null` to pause fetching.
 */
export function useApi<T>(
  path: string | null,
  opts?: { fallback?: T },
): UseApiState<T> {
  const [data, setData] = useState<T | null>(opts?.fallback ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<T>(path);
      if (!mountedRef.current) return;
      if (res.error) {
        setError(res.error);
      } else {
        setData(res.data ?? null);
      }
    } catch (e) {
      if (mountedRef.current) setError((e as Error).message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => {
      mountedRef.current = false;
    };
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
