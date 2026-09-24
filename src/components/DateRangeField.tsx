"use client";
import { useEffect, useRef, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { CalendarDays } from "lucide-react";
import { fromISO, toISO, inr } from "@/lib/utils";

type CalendarItem = { date: string; price: number; blocked: boolean; overridden?: boolean; minNights?: number | null };

type Props = {
  value?: DateRange;
  onChange: (r: DateRange | undefined) => void;
  disabledRanges?: { from: string; to: string }[];
  calendarItems?: CalendarItem[];
  calendarEndpoint?: string;
  align?: "left" | "right";
  label?: string;
  className?: string;
};

const fmt = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(d);

function PriceDayButton({ day, modifiers, ...props }: any) {
  const iso = toISO(day.date);
  const item = (props as any).__calendarItems?.find((x: CalendarItem) => x.date === iso) as CalendarItem | undefined;
  return (
    <button {...props} disabled={props.disabled} className={`vhi-calendar-day ${modifiers.selected ? "is-selected" : ""} ${modifiers.range_middle ? "is-middle" : ""} ${item?.blocked ? "is-blocked" : ""}`}>
      <span className="vhi-calendar-date">{day.date.getDate()}</span>
      {item ? <span className="vhi-calendar-price">{item.blocked ? "Booked" : inr(item.price).replace("₹", "₹")}</span> : null}
    </button>
  );
}

export default function DateRangeField({ value, onChange, disabledRanges = [], calendarItems: initialCalendarItems = [], calendarEndpoint, align = "left", label = "Dates", className }: Props) {
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState(1);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>(initialCalendarItems);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const set = () => setMonths(mq.matches ? 2 : 1);
    set(); mq.addEventListener("change", set); return () => mq.removeEventListener("change", set);
  }, []);
  useEffect(() => {
    if (!calendarEndpoint || !open) return;
    let cancelled = false;
    const load = async (monthDate: Date) => {
      const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
      const r = await fetch(`${calendarEndpoint}?month=${month}`);
      if (!r.ok) return [];
      const d = await r.json();
      return d.items ?? [];
    };
    const base = new Date();
    Promise.all([load(base), load(new Date(base.getFullYear(), base.getMonth() + 1, 1))]).then((sets) => {
      if (!cancelled) setCalendarItems(sets.flat());
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [calendarEndpoint, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const text = value?.from && value?.to ? `${fmt(value.from)} to ${fmt(value.to)}` : value?.from ? `${fmt(value.from)} to ?` : "Add dates";
  const blocked = calendarItems.filter((x) => x.blocked).map((x) => fromISO(x.date));

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <span className="label">{label}</span>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 rounded-full border-[1.5px] border-line bg-white px-3.5 py-[0.7rem] text-left text-[0.95rem] hover:border-lake">
        <CalendarDays size={17} className="text-stone" /><span className={value?.from ? "text-pine" : "text-stone"}>{text}</span>
      </button>
      {open && (
        <div className={`absolute z-50 mt-2 rounded-2xl border border-line bg-white p-3 shadow-2xl ${align === "right" ? "right-0" : "left-0"}`}>
          <DayPicker
            mode="range" numberOfMonths={months} selected={value} onSelect={(r) => { onChange(r); if (r?.from && r?.to && r.to > r.from) setOpen(false); }}
            startMonth={today}
            disabled={[{ before: today }, ...disabledRanges.map((r) => ({ from: fromISO(r.from), to: fromISO(r.to) })), ...blocked]}
            onMonthChange={(month) => {
              if (!calendarEndpoint) return;
              const m = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
              fetch(`${calendarEndpoint}?month=${m}`).then((r) => r.ok ? r.json() : null).then((d) => { if (d?.items) setCalendarItems((prev) => [...prev.filter((x) => !d.items.some((n: CalendarItem) => n.date === x.date)), ...d.items]); }).catch(() => {});
            }}
            components={{ DayButton: (props: any) => <PriceDayButton {...props} __calendarItems={calendarItems} /> as any } as any}
          />
          <div className="mt-2 flex flex-wrap gap-3 border-t border-line pt-2 text-[10px] text-stone"><span>Prices shown per night</span><span>Booked dates are disabled</span></div>
        </div>
      )}
    </div>
  );
}
export { toISO };
