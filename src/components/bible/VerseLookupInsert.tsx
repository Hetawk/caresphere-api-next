"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, PlusCircle, BookOpen } from "lucide-react";
import { api } from "@/lib/api-client";
import { Spinner } from "@/components/ui/Spinner";
import { normalizeBibleReference } from "@/lib/bible-reference";

type Translation = {
  id: number;
  title: string;
  abbreviation?: string;
};

type Verse = {
  reference?: string;
  content?: string;
  version_abbreviation?: string;
};

type Props = {
  onInsert: (text: string) => void;
  compact?: boolean;
};

function toPlainText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function VerseLookupInsert({ onInsert, compact = false }: Props) {
  const [referenceInput, setReferenceInput] = useState("");
  const [translationId, setTranslationId] = useState("");
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loadingTranslations, setLoadingTranslations] = useState(false);

  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    reference: string;
    text: string;
    version?: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoadingTranslations(true);
    api
      .get<Translation[] | { items?: Translation[] }>("/bible/translations")
      .then((res) => {
        if (!mounted) return;
        setLoadingTranslations(false);
        if (res.error) return;
        const raw = res.data;
        const list = Array.isArray(raw)
          ? raw
          : ((raw as { items?: Translation[] })?.items ?? []);
        setTranslations(list);
        if (list.length > 0 && !translationId) {
          setTranslationId(String(list[0]?.id ?? ""));
        }
      });

    return () => {
      mounted = false;
    };
  }, [translationId]);

  const normalizedReference = useMemo(
    () => normalizeBibleReference(referenceInput),
    [referenceInput],
  );

  const canSearch = referenceInput.trim().length > 0;

  async function lookupVerse() {
    if (!canSearch) return;
    setSearching(true);
    setError(null);
    setResult(null);

    const encoded = encodeURIComponent(normalizedReference);
    const url = translationId
      ? `/bible/passages/${encoded}?translationId=${encodeURIComponent(translationId)}`
      : `/bible/passages/${encoded}`;

    const res = await api.get<Verse[] | Verse>(url);
    setSearching(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    const data = res.data;
    const verses = Array.isArray(data) ? data : data ? [data] : [];
    const first = verses[0];

    if (!first?.content) {
      setError("No verse content found for that reference.");
      return;
    }

    const text = toPlainText(first.content);
    const ref = first.reference ?? normalizedReference;
    const selectedTranslation = translations.find(
      (t) => String(t.id) === translationId,
    );

    setResult({
      reference: ref,
      text,
      version:
        first.version_abbreviation ??
        selectedTranslation?.abbreviation ??
        selectedTranslation?.title,
    });
  }

  return (
    <div
      className={`rounded-xl border border-[#E3D4C2] bg-[#FAF7F3] ${compact ? "p-3" : "p-4"}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-[#C8A061]" />
        <p className="text-xs font-semibold uppercase tracking-wider text-[rgba(26,26,26,0.55)]">
          Verse Lookup
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
        <input
          className="cs-input w-full"
          value={referenceInput}
          onChange={(e) => setReferenceInput(e.target.value)}
          placeholder="John 3:16 or JHN.3.16"
        />
        <select
          className="cs-input w-full"
          value={translationId}
          onChange={(e) => setTranslationId(e.target.value)}
          disabled={loadingTranslations}
        >
          {!translations.length && <option value="">Default</option>}
          {translations.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.abbreviation ?? t.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={lookupVerse}
          disabled={!canSearch || searching}
          className="cs-btn-ghost flex items-center justify-center gap-1.5"
        >
          {searching ? <Spinner size="sm" /> : <Search className="h-4 w-4" />}
          Find
        </button>
      </div>

      <p className="mt-2 text-[11px] text-[rgba(26,26,26,0.45)]">
        Supports references like{" "}
        <code className="rounded bg-[#F0E8DA] px-1">Romans 8:28</code> or{" "}
        <code className="rounded bg-[#F0E8DA] px-1">ROM.8.28</code>.
      </p>

      {error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-[#8E0E00]">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3 rounded-lg border border-[#E3D4C2] bg-white p-3">
          <p className="text-xs font-semibold text-[#1F1C18]">
            {result.reference}
            {result.version ? ` (${result.version})` : ""}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[rgba(26,26,26,0.72)]">
            {result.text}
          </p>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() =>
                onInsert(
                  `${result.reference}${result.version ? ` (${result.version})` : ""}\n${result.text}`,
                )
              }
              className="cs-btn-primary flex items-center gap-1.5 text-xs"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Insert into text
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
