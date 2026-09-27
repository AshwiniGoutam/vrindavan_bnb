"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { Quote } from "@/server/services/pricing/types";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

export type QuoteBody = { vertical: "stay"; request: Record<string, unknown> } | { vertical: "darshan"; request: Record<string, unknown> };

export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
  details?: Record<string, unknown>;
}

export async function postJSON<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: ApiError }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({ ok: false, error: { code: "NETWORK", message: "Unexpected response." } }));
    return json;
  } catch {
    return { ok: false, error: { code: "NETWORK", message: "You seem to be offline. Please check your connection." } };
  }
}

/** Debounced live quote from the server (the only source of prices). */
export function useQuote(body: QuoteBody | null, delay = 350) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const key = body ? JSON.stringify(body) : "";
  const seq = useRef(0);

  useEffect(() => {
    if (!key) {
      setQuote(null);
      setError(null);
      return;
    }
    const id = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await postJSON<{ quote: Quote }>("/api/quote", JSON.parse(key));
      if (id !== seq.current) return;
      setLoading(false);
      if (res.ok) {
        setQuote(res.data.quote);
        setError(null);
      } else {
        setQuote(null);
        setError(res.error);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [key, delay]);

  return { quote, error, loading };
}

export function Counter({ label, hint, value, min, max, onChange }: { label: string; hint?: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm text-charcoal">{label}</p>
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="flex h-8 w-8 items-center justify-center rounded-full border hairline disabled:opacity-30">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-5 text-center tabular-nums" aria-live="polite">{value}</span>
        <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="flex h-8 w-8 items-center justify-center rounded-full border hairline disabled:opacity-30">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ChildAges({ count, ages, onChange }: { count: number; ages: number[]; onChange: (a: number[]) => void }) {
  if (!count) return null;
  return (
    <div className="grid grid-cols-3 gap-2 pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <label key={i} className="field">
          <span className="field-label">Child {i + 1} age</span>
          <select
            className="input !py-2 text-sm"
            value={ages[i] ?? 8}
            onChange={(e) => {
              const next = [...ages];
              next[i] = Number(e.target.value);
              onChange(next.slice(0, count));
            }}
          >
            {Array.from({ length: 18 }).map((_, a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

export function QuoteSummary({ quote, loading, compact }: { quote: Quote | null; loading?: boolean; compact?: boolean }) {
  if (!quote) return null;
  const main = quote.lines.filter((l) => l.type !== "addon");
  const addons = quote.lines.filter((l) => l.type === "addon");
  return (
    <div className={cn("text-sm transition-opacity", loading && "opacity-50")}>
      <dl className="space-y-2.5">
        {main.map((l, i) => (
          <div key={i} className="flex justify-between gap-4">
            <dt className="text-muted">{l.label}</dt>
            <dd className="tabular-nums">{formatINR(l.amount)}</dd>
          </div>
        ))}
        {!compact &&
          addons.map((l, i) => (
            <div key={`a${i}`} className="flex justify-between gap-4">
              <dt className="text-muted">{l.label}</dt>
              <dd className="tabular-nums">{formatINR(l.amount)}</dd>
            </div>
          ))}
        {quote.discount ? (
          <div className="flex justify-between gap-4 text-success">
            <dt>{quote.discount.name}{quote.discount.code ? ` (${quote.discount.code})` : ""}</dt>
            <dd className="tabular-nums">−{formatINR(quote.discount.amount)}</dd>
          </div>
        ) : null}
        {quote.gstTotal > 0 ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">GST</dt>
            <dd className="tabular-nums">{formatINR(quote.gstTotal)}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-4 flex items-baseline justify-between border-t hairline pt-4">
        <span className="font-medium text-ink">Total</span>
        <span className="text-right">
          {quote.display.compareAtTotal && quote.display.compareAtTotal > quote.total ? <s className="mr-2 text-muted">{formatINR(quote.display.compareAtTotal)}</s> : null}
          <span className="display text-3xl text-ink">{formatINR(quote.total)}</span>
        </span>
      </div>
      {quote.discountRejected ? <p className="mt-3 text-xs text-danger">{quote.discountRejected}</p> : null}
    </div>
  );
}

export function Steps({ current, steps }: { current: number; steps: string[] }) {
  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[0.66rem] uppercase tracking-[0.16em]">
      {steps.map((s, i) => (
        <li key={s} className={cn("flex items-center gap-2", i + 1 === current ? "text-ink" : i + 1 < current ? "text-umber" : "text-taupe")}>
          <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border text-[0.6rem]", i + 1 <= current ? "border-charcoal" : "border-taupe/50", i + 1 === current && "bg-charcoal text-ivory")}>{i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}
