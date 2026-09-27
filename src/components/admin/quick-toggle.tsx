"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** One-click field switch in admin lists (publish/unpublish, maintenance on/off). Uses the same validated PATCH as the form. */
export function QuickToggle({ resource, id, field, value, on, off, labelOn, labelOff }: { resource: string; id: string; field: string; value?: string | null; on: string; off: string; labelOn: string; labelOff: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOn = value === on;

  async function toggle() {
    setBusy(true);
    setError(null);
    const body = field.split(".").reduceRight<unknown>((acc, key) => ({ [key]: acc }), isOn ? off : on);
    const res = await fetch(`/api/admin/resources/${resource}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!json.ok) setError(json?.error?.message ?? "Failed");
    else router.refresh();
  }

  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={toggle} disabled={busy} className={cn("whitespace-nowrap border px-2.5 py-1 text-[0.7rem] transition-colors", isOn ? "hairline hover:border-charcoal" : "border-charcoal bg-charcoal text-ivory hover:bg-ink")}>
        {busy ? "…" : isOn ? labelOff : labelOn}
      </button>
      {error ? <span className="mt-1 text-[0.65rem] text-danger">{error}</span> : null}
    </span>
  );
}
