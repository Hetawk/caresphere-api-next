/**
 * Lightweight typed API client for the CareSphere admin panel.
 * Reads the auth token from localStorage and attaches it automatically.
 * All methods return { data?, error? } — they never throw.
 */

const BASE = "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cs_token");
}

interface ApiOptions extends RequestInit {
  base?: string;
}

export interface ApiResult<T = unknown> {
  data?: T;
  error?: string;
}

async function request<T>(
  path: string,
  opts: ApiOptions = {},
): Promise<ApiResult<T>> {
  try {
    const { base = BASE, ...init } = opts;
    const token = getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string>),
    };
    const res = await fetch(`${base}${path}`, { ...init, headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      // API envelope: { success: false, error: { message, code } }
      // or legacy:    { message: "..." }  or  { error: "..." }
      const errField = json?.error;
      const msg =
        (errField && typeof errField === "object"
          ? (errField.message ?? errField.detail ?? JSON.stringify(errField))
          : errField) ??
        json?.message ??
        json?.detail ??
        `Request failed (${res.status})`;
      return { error: typeof msg === "string" ? msg : String(msg) };
    }
    // Unwrap the standard API envelope { success: true, data: <payload> }
    const payload =
      json && json.success !== undefined ? (json.data ?? json) : json;
    return { data: payload as T };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}

export const api = {
  get: <T>(path: string, opts?: ApiOptions) =>
    request<T>(path, { method: "GET", ...opts }),
  post: <T>(path: string, body: unknown, opts?: ApiOptions) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), ...opts }),
  put: <T>(path: string, body: unknown, opts?: ApiOptions) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body), ...opts }),
  patch: <T>(path: string, body: unknown, opts?: ApiOptions) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body), ...opts }),
  delete: (path: string, opts?: ApiOptions) =>
    request<unknown>(path, { method: "DELETE", ...opts }),
};
