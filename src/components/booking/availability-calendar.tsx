"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, diffDays } from "@/lib/dates";
import { cn } from "@/lib/utils";

const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const monthLabel = (y: number, m: number) => new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

interface Props {
  unavailable: string[];
  checkIn: string;
  checkOut: string;
  onChange: (range: { checkIn: string; checkOut: string }) => void;
  minDate: string;
  maxDate: string;
  minNights?: number;
  /** Stay + Food packages: checkout = check-in + fixed nights */
  fixedNights?: number;
  loading?: boolean;
}

/**
 * Range calendar that greys out booked nights. A booked night can still be a check-out date
 * (you leave that morning), but no selected range may contain a booked night.
 */
export function AvailabilityCalendar({ unavailable, checkIn, checkOut, onChange, minDate, maxDate, minNights = 1, fixedNights, loading }: Props) {
  const blocked = useMemo(() => new Set(unavailable), [unavailable]);
  const start = checkIn || minDate;
  const [cursor, setCursor] = useState(() => ({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 }));
  const [hover, setHover] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const rangeFree = (from: string, to: string) => {
    for (let d = from; d < to; d = addDays(d, 1)) if (blocked.has(d)) return false;
    return true;
  };

  function pick(day: string) {
    setNote(null);
    if (fixedNights) {
      if (blocked.has(day)) return;
      const out = addDays(day, fixedNights);
      if (!rangeFree(day, out)) return setNote(`Those ${fixedNights} nights aren't all free — try another start date.`);
      return onChange({ checkIn: day, checkOut: out });
    }
    if (!checkIn || checkOut || day <= checkIn) {
      if (blocked.has(day)) return;
      return onChange({ checkIn: day, checkOut: "" });
    }
    if (!rangeFree(checkIn, day)) return setNote("That range includes a booked night. Choose an earlier check-out.");
    if (diffDays(checkIn, day) < minNights) return setNote(`Minimum stay is ${minNights} nights.`);
    onChange({ checkIn, checkOut: day });
  }

  const months = [cursor, cursor.m === 11 ? { y: cursor.y + 1, m: 0 } : { y: cursor.y, m: cursor.m + 1 }];
  const shift = (d: number) => setCursor((c) => {
    const t = c.y * 12 + c.m + d;
    return { y: Math.floor(t / 12), m: t % 12 };
  });
  const canPrev = iso(cursor.y, cursor.m, 1) > minDate.slice(0, 8) + "01";
  const previewEnd = checkIn && !checkOut && !fixedNights ? hover : "";

  return (
    <div className={cn("select-none", loading && "opacity-60")}>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Previous month" className="p-1 disabled:opacity-20"><ChevronLeft className="h-4 w-4" /></button>
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">{checkIn && !checkOut && !fixedNights ? "Select check-out" : "Select check-in"}</span>
        <button type="button" onClick={() => shift(1)} aria-label="Next month" className="p-1"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {months.map(({ y, m }, idx) => {
          const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
          const lead = (first + 6) % 7;
          const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
          return (
            <div key={`${y}-${m}`} className={idx === 1 ? "hidden sm:block" : ""}>
              <p className="mb-2 text-center text-sm font-medium text-ink">{monthLabel(y, m)}</p>
              <div className="grid grid-cols-7 text-center text-[0.62rem] text-taupe">{WEEK.map((w) => <span key={w} className="py-1">{w}</span>)}</div>
              <div className="grid grid-cols-7 text-center text-sm">
                {Array.from({ length: lead }).map((_, i) => <span key={`l${i}`} />)}
                {Array.from({ length: days }, (_, i) => {
                  const d = iso(y, m, i + 1);
                  const out = d < minDate || d > maxDate;
                  const isBlocked = blocked.has(d);
                  const end = checkOut || previewEnd;
                  const inRange = checkIn && end && d > checkIn && d < end;
                  const isEdge = d === checkIn || d === checkOut;
                  // a blocked night is still selectable as a check-out date
                  const selectableAsCheckout = !!checkIn && !checkOut && !fixedNights && d > checkIn;
                  const disabled = out || (isBlocked && !selectableAsCheckout);
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={disabled}
                      onClick={() => pick(d)}
                      onMouseEnter={() => setHover(d)}
                      aria-label={`${d}${isBlocked ? " (booked)" : ""}`}
                      aria-pressed={isEdge}
                      className={cn(
                        "relative h-9 text-[0.82rem] transition-colors",
                        inRange && "bg-linen",
                        isEdge && "bg-charcoal text-ivory",
                        !isEdge && !disabled && "hover:bg-sand/60",
                        disabled && "cursor-not-allowed text-taupe/50",
                        isBlocked && !out && "line-through decoration-taupe/60",
                      )}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[0.68rem] text-muted">
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 bg-charcoal" /> Selected</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 text-center leading-3 text-taupe line-through">7</span> Booked</span>
        {checkIn ? <button type="button" className="ml-auto underline" onClick={() => onChange({ checkIn: "", checkOut: "" })}>Clear dates</button> : null}
      </div>
      {note ? <p className="mt-2 text-xs text-danger">{note}</p> : null}
    </div>
  );
}
