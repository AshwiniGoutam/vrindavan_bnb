"use client";

import { useEffect, useState } from "react";
import { trackPurchase } from "@/lib/analytics/client";
import { postJSON } from "./shared";
import { launchPayment, type CheckoutSession } from "./pay";

export function RetryPayment({ code }: { code: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mock, setMock] = useState<((ok: boolean) => void) | null>(null);
  async function retry() {
    setBusy(true);
    setError(null);
    const res = await postJSON<CheckoutSession>(`/api/bookings/${code}/retry`, {});
    if (!res.ok) {
      setBusy(false);
      setError(res.error.message);
      return;
    }
    await launchPayment(res.data, { onMockPrompt: () => new Promise<boolean>((r) => setMock(() => r)) });
  }
  return (
    <div>
      <button className="btn btn-primary" onClick={retry} disabled={busy}>{busy ? "Opening payment…" : "Retry payment"}</button>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {mock ? (
        <div className="mt-4 flex gap-3">
          <button className="btn btn-outline" onClick={() => { mock(false); setMock(null); }}>Simulate fail</button>
          <button className="btn btn-primary" onClick={() => { mock(true); setMock(null); }}>Simulate success</button>
        </div>
      ) : null}
    </div>
  );
}

export function HoldCountdown({ until }: { until: string }) {
  const [left, setLeft] = useState(() => new Date(until).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(new Date(until).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  if (left <= 0) return <span>Your hold has expired.</span>;
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return <span className="tabular-nums">Dates held for {m}:{String(s).padStart(2, "0")}</span>;
}

/** Fires GA4/Meta purchase once, deduplicated with Conversions API by booking code. */
export function PurchaseTracker({ code, value, name, vertical }: { code: string; value: number; name: string; vertical: string }) {
  useEffect(() => {
    const key = `vhi_purchase_${code}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    trackPurchase({ code, value, name, vertical });
  }, [code, value, name, vertical]);
  return null;
}
