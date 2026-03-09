"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { Spinner } from "@/components/ui/Spinner";
import { BookOpen, Play, Copy, CheckCircle2 } from "lucide-react";
import type { Organization } from "@/lib/types";

const QUICK_ENDPOINTS = [
  "bibles?language_ranges[]=en&page_size=10",
  "bibles/3034",
  "bibles/3034/index",
  "bibles/3034/passages/JHN.3.16?format=text",
  "bibles/3034/books/GEN/chapters",
  `verse_of_the_days/${Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)}`,
  "verse_of_the_days",
  "languages?page_size=10",
  "licenses?all_available=true",
  "organizations",
];

export default function BiblePlaygroundPage() {
  const { data: org, loading: orgLoading } = useApi<Organization>("/orgs/me");

  const [method, setMethod] = useState<"GET" | "POST" | "DELETE">("GET");
  const [path, setPath] = useState("bibles?language_ranges[]=en&page_size=5");
  const [jsonBody, setJsonBody] = useState("{}");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [result, setResult] = useState<string>("");

  const enabled = useMemo(
    () => org?.organizationType === "CHURCH" || org?.bibleEnabled === true,
    [org],
  );

  const endpoint = `/bible/yv/${path.replace(/^\/+/, "")}`;

  async function runRequest() {
    setRunning(true);
    setStatus(null);
    setResult("");

    let body: unknown = undefined;
    if (method === "POST") {
      try {
        body = JSON.parse(jsonBody || "{}");
      } catch {
        setRunning(false);
        setResult("Invalid JSON body");
        return;
      }
    }

    const res =
      method === "GET"
        ? await api.get<unknown>(endpoint)
        : method === "POST"
          ? await api.post<unknown>(endpoint, body)
          : await api.delete(endpoint);

    setRunning(false);
    if (res.error) {
      setStatus(400);
      setResult(res.error);
      return;
    }

    setStatus(200);
    setResult(JSON.stringify(res.data ?? null, null, 2));
  }

  if (orgLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner size="lg" className="text-[#C8A061]" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Bible API Playground"
          subtitle="Available only for Christian organizations with Bible features enabled"
        />
        <div className="cs-card rounded-xl border border-[#E3D4C2] p-6 text-sm text-[rgba(26,26,26,0.7)]">
          Your organization is not configured for Bible features. Set organization
          type to <strong>CHURCH</strong> or enable Bible features in settings.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bible API Playground"
        subtitle="Test full YouVersion endpoints through /api/bible/yv/*"
      />

      <div className="cs-card rounded-xl border border-[#E3D4C2] p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1F1C18]">
          <BookOpen className="h-4 w-4 text-[#C8A061]" />
          Quick endpoints
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ENDPOINTS.map((e) => (
            <button
              key={e}
              onClick={() => setPath(e)}
              className="rounded-full border border-[#E3D4C2] bg-white px-3 py-1 text-xs text-[#1F1C18] hover:bg-[#FAF7F3]"
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="cs-card space-y-4 rounded-xl border border-[#E3D4C2] p-6">
        <div className="grid gap-3 md:grid-cols-[120px_1fr]">
          <select
            className="cs-input"
            value={method}
            onChange={(e) => setMethod(e.target.value as "GET" | "POST" | "DELETE")}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input
            className="cs-input w-full font-mono text-sm"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="bibles/3034/passages/JHN.3.16"
          />
        </div>

        {method === "POST" && (
          <textarea
            rows={6}
            className="cs-input w-full resize-y font-mono text-sm"
            value={jsonBody}
            onChange={(e) => setJsonBody(e.target.value)}
            placeholder='{"bible_id":3034,"passage_id":"MAT.1.1","color":"44aa44"}'
          />
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={runRequest}
            disabled={running}
            className="cs-btn-primary flex items-center gap-2"
          >
            {running ? <Spinner size="sm" /> : <Play className="h-4 w-4" />} Run
          </button>
          <code className="rounded bg-[#F4EEE5] px-2 py-1 text-xs text-[#5B5146]">
            /api{endpoint}
          </code>
        </div>

        <div className="rounded-lg border border-[#E3D4C2] bg-[#FAF7F3] p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.45)]">
              Response {status ? `(${status})` : ""}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(result || "")}
              className="flex items-center gap-1 text-xs text-[#8A6A2B] hover:underline"
            >
              {result ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy
            </button>
          </div>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded bg-white p-3 font-mono text-xs text-[#1F1C18]">
            {result || "Run a request to see response..."}
          </pre>
        </div>
      </div>
    </div>
  );
}
