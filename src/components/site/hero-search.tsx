"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, MapPin, Minus, Plus, Search, Users, Mountain } from "lucide-react";
import { addDays, todayIST } from "@/lib/dates";
import { cn } from "@/lib/utils";

export interface HeroTour {
  slug: string;
  title: string;
  durationLabel?: string;
  minGroupSize: number;
  advanceDays: number;
}

const fmt = (d: string) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "");

/** A field that looks like a label + value but opens the native date picker (great on mobile). */
function DateField({ label, value, min, onChange }: { label: string; value: string; min: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <label className="relative flex cursor-pointer items-center gap-3 bg-paper px-4 py-3 transition-colors hover:bg-white" onClick={() => ref.current?.showPicker?.()}>
      <CalendarDays className="h-4 w-4 shrink-0 text-umber" strokeWidth={1.4} />
      <span className="flex min-w-0 flex-col">
        <span className="text-[0.7rem] text-muted">{label}</span>
        <span className={cn("truncate text-sm", value ? "text-ink" : "text-charcoal/70")}>{value ? fmt(value) : "Select date"}</span>
      </span>
      <input ref={ref} type="date" min={min} value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={label} />
    </label>
  );
}

function GuestsField({ adults, children, setAdults, setChildren, minAdults = 1 }: { adults: number; children: number; setAdults: (n: number) => void; setChildren: (n: number) => void; minAdults?: number }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const total = adults + children;
  const Row = ({ label, hint, value, min, set }: { label: string; hint: string; value: number; min: number; set: (n: number) => void }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm text-ink">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" disabled={value <= min} onClick={() => set(value - 1)} aria-label={`Fewer ${label}`} className="flex h-8 w-8 items-center justify-center rounded-full border hairline disabled:opacity-30"><Minus className="h-3.5 w-3.5" /></button>
        <span className="w-5 text-center tabular-nums">{value}</span>
        <button type="button" disabled={value >= 40} onClick={() => set(value + 1)} aria-label={`More ${label}`} className="flex h-8 w-8 items-center justify-center rounded-full border hairline disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex h-full w-full items-center gap-3 bg-paper px-4 py-3 text-left transition-colors hover:bg-white">
        <Users className="h-4 w-4 shrink-0 text-umber" strokeWidth={1.4} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[0.7rem] text-muted">Guests</span>
          <span className="truncate text-sm text-ink">
            {total} Guest{total === 1 ? "" : "s"}
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 right-0 z-30 mb-2 min-w-64 divide-y hairline border hairline bg-ivory px-4 shadow-[0_20px_50px_rgba(14,13,12,0.15)] md:bottom-auto md:top-full md:mb-0 md:mt-2">
          <Row label="Adults" hint="13 years and above" value={adults} min={minAdults} set={setAdults} />
          <Row label="Children" hint="Under 13" value={children} min={0} set={setChildren} />
          <div className="py-3 text-right">
            <button type="button" className="text-xs font-medium underline" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Hero search with Stays / Darshan Tours tabs (image-1 style). */
export function HeroSearch({ tours, whatsapp }: { tours: HeroTour[]; whatsapp?: string }) {
  const router = useRouter();
  const today = todayIST();
  const [tab, setTab] = useState<"stays" | "darshan">("stays");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [tourSlug, setTourSlug] = useState(tours[0]?.slug ?? "");
  const [travelDate, setTravelDate] = useState("");
  const tour = tours.find((t) => t.slug === tourSlug);
  const earliest = tour ? addDays(today, tour.advanceDays) : today;

  function search() {
    if (tab === "stays") {
      const sp = new URLSearchParams();
      if (checkIn) sp.set("checkIn", checkIn);
      if (checkOut && checkOut > checkIn) sp.set("checkOut", checkOut);
      sp.set("guests", String(adults + children));
      router.push(`/stays?${sp}`);
    } else if (tour) {
      const sp = new URLSearchParams({ adults: String(adults), children: String(children) });
      if (travelDate) sp.set("date", travelDate);
      router.push(`/darshan-tours/${tour.slug}?${sp}#book`);
    } else router.push("/darshan-tours");
  }

  return (
    <div className="w-full">
      <div className="flex" role="tablist" aria-label="Search type">
        {(
          [
            ["stays", "Stays"],
            ["darshan", "Darshan Tours"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              if (key === "darshan" && tour) setAdults((a) => Math.max(a, tour.minGroupSize));
            }}
            className={cn("px-7 py-3 text-[0.8rem] font-medium transition-colors", tab === key ? "bg-charcoal text-ivory" : "bg-ivory/85 text-charcoal backdrop-blur hover:bg-ivory")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="border hairline bg-ivory/95 p-2 shadow-[0_24px_60px_rgba(14,13,12,0.12)] backdrop-blur">
        {tab === "stays" ? (
          <div className="grid gap-2 md:grid-cols-[1.1fr_1fr_1fr_1fr_auto]">
            <div className="flex items-center gap-3 bg-paper px-4 py-3">
              <MapPin className="h-4 w-4 shrink-0 text-umber" strokeWidth={1.4} />
              <span className="flex flex-col">
                <span className="text-[0.7rem] text-muted">Destination</span>
                <span className="text-sm font-medium text-ink">Vrindavan</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 md:contents">
              <DateField label="Check in" value={checkIn} min={today} onChange={(v) => { setCheckIn(v); if (!checkOut || checkOut <= v) setCheckOut(addDays(v, 1)); }} />
              <DateField label="Check out" value={checkOut} min={checkIn ? addDays(checkIn, 1) : addDays(today, 1)} onChange={setCheckOut} />
            </div>
            <GuestsField adults={adults} children={children} setAdults={setAdults} setChildren={setChildren} />
            <button type="button" onClick={search} className="flex items-center justify-center gap-2 bg-charcoal px-10 py-4 text-sm font-medium text-ivory transition-colors hover:bg-ink md:flex-col md:gap-1 md:py-3">
              <Search className="h-4 w-4" strokeWidth={1.6} /> Search
            </button>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr_auto]">
            <label className="relative flex items-center gap-3 bg-paper px-4 py-3">
              <Mountain className="h-4 w-4 shrink-0 text-umber" strokeWidth={1.4} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[0.7rem] text-muted">Journey</span>
                <select
                  value={tourSlug}
                  onChange={(e) => {
                    setTourSlug(e.target.value);
                    const t = tours.find((x) => x.slug === e.target.value);
                    if (t) setAdults((a) => Math.max(a, t.minGroupSize));
                  }}
                  className="-ml-1 truncate bg-transparent text-sm text-ink outline-none"
                >
                  {tours.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.title}{t.durationLabel ? ` · ${t.durationLabel}` : ""}
                    </option>
                  ))}
                  {!tours.length ? <option value="">All journeys</option> : null}
                </select>
              </span>
            </label>
            <DateField label={`Travel date (from ${fmt(earliest)})`} value={travelDate} min={earliest} onChange={setTravelDate} />
            <GuestsField adults={adults} children={children} setAdults={setAdults} setChildren={setChildren} minAdults={1} />
            <button type="button" onClick={search} className="flex items-center justify-center gap-2 bg-charcoal px-10 py-4 text-sm font-medium text-ivory transition-colors hover:bg-ink md:flex-col md:gap-1 md:py-3">
              <Search className="h-4 w-4" strokeWidth={1.6} /> Search
            </button>
          </div>
        )}
      </div>
      {tab === "darshan" && tour ? (
        <p className="mt-2 text-xs text-charcoal/70 [text-shadow:0_1px_2px_rgba(242,239,232,.6)]">
          Minimum {tour.minGroupSize} guests · book at least {tour.advanceDays} days ahead
          {whatsapp ? " · sooner? WhatsApp us" : ""}
        </p>
      ) : null}
    </div>
  );
}