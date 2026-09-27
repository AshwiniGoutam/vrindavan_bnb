"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { todayIST, addDays } from "@/lib/dates";

export function StaysFilters({ types }: { types: { value: string; label: string }[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const update = (k: string, v: string) => {
    const next = new URLSearchParams(sp.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    if (k === "checkIn" && v && (!next.get("checkOut") || next.get("checkOut")! <= v)) next.set("checkOut", addDays(v, 1));
    start(() => router.replace(`/stays?${next.toString()}`, { scroll: false }));
  };
  const today = todayIST();
  return (
    <div className={`grid gap-px border hairline bg-charcoal/10 sm:grid-cols-2 lg:grid-cols-5 ${pending ? "opacity-60" : ""}`}>
      <label className="field bg-paper p-4">
        <span className="field-label">Check-in</span>
        <input type="date" min={today} className="bg-transparent text-sm outline-none" value={sp.get("checkIn") ?? ""} onChange={(e) => update("checkIn", e.target.value)} />
      </label>
      <label className="field bg-paper p-4">
        <span className="field-label">Check-out</span>
        <input type="date" min={sp.get("checkIn") ? addDays(sp.get("checkIn")!, 1) : today} className="bg-transparent text-sm outline-none" value={sp.get("checkOut") ?? ""} onChange={(e) => update("checkOut", e.target.value)} />
      </label>
      <label className="field bg-paper p-4">
        <span className="field-label">Guests</span>
        <select className="bg-transparent text-sm outline-none" value={sp.get("guests") ?? ""} onChange={(e) => update("guests", e.target.value)}>
          <option value="">Any</option>
          {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((g) => (
            <option key={g} value={g}>{g}+ guests</option>
          ))}
        </select>
      </label>
      <label className="field bg-paper p-4">
        <span className="field-label">Type</span>
        <select className="bg-transparent text-sm outline-none" value={sp.get("type") ?? ""} onChange={(e) => update("type", e.target.value)}>
          <option value="">All homes</option>
          {types.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>
      <label className="field bg-paper p-4">
        <span className="field-label">Sort</span>
        <select className="bg-transparent text-sm outline-none" value={sp.get("sort") ?? ""} onChange={(e) => update("sort", e.target.value)}>
          <option value="">Recommended</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </label>
    </div>
  );
}
