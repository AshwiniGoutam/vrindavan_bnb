"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { MapPin, Minus, Plus, Search, Users } from "lucide-react";
import DateRangeField from "@/components/DateRangeField";
import { fromISO, toISO } from "@/lib/utils";

type Initial = { city?: string; checkIn?: string; checkOut?: string; guests?: number };

export default function SearchBar({ cities, initial }: { cities: string[]; initial?: Initial }) {
  const router = useRouter();
  const [city, setCity] = useState(initial?.city ?? "");
  const [guests, setGuests] = useState(initial?.guests ?? 2);
  const [range, setRange] = useState<DateRange | undefined>(
    initial?.checkIn && initial?.checkOut ? { from: fromISO(initial.checkIn), to: fromISO(initial.checkOut) } : undefined,
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (city.trim()) p.set("city", city.trim());
    if (range?.from && range?.to) { p.set("checkIn", toISO(range.from)); p.set("checkOut", toISO(range.to)); }
    p.set("guests", String(guests));
    router.push(`/stays?${p.toString()}`);
  }

  return (
    <form onSubmit={submit} role="search"
      className="mx-auto grid max-w-5xl gap-3 rounded-full border border-line bg-white py-5 px-8 shadow-[0_20px_60px_-20px_rgba(18,53,47,.35)] md:grid-cols-[1.2fr_1.3fr_1fr_auto] md:items-end">
      <div>
        <label htmlFor="where" className="label">Where</label>
        <div className="flex items-center gap-2 rounded-full border-[1.5px] border-line px-3.5 focus-within:border-lake">
          <MapPin size={17} className="text-stone" />
          <input id="where" list="cities" value={city} onChange={(e) => setCity(e.target.value)}
            placeholder="City or villa name" className="w-full rounded-full bg-transparent py-[0.7rem] text-[0.95rem] outline-none" />
          <datalist id="cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
      </div>
      <DateRangeField value={range} onChange={setRange} label="Check-in and check-out" />
      <div>
        <span className="label">Guests</span>
        <div className="flex items-center justify-between rounded-full border-[1.5px] border-line px-3.5 py-[0.45rem]">
          <Users size={17} className="text-stone" />
          <button type="button" aria-label="Fewer guests" onClick={() => setGuests((g) => Math.max(1, g - 1))}
            className="flex size-8 items-center justify-center rounded-full border border-line hover:bg-mist"><Minus size={14} /></button>
          <span className="w-16 text-center text-[0.95rem]" aria-live="polite">{guests} guest{guests > 1 ? "s" : ""}</span>
          <button type="button" aria-label="More guests" onClick={() => setGuests((g) => Math.min(30, g + 1))}
            className="flex size-8 items-center justify-center rounded-full border border-line hover:bg-mist"><Plus size={14} /></button>
        </div>
      </div>
      <button className="btn btn-primary h-[3.05rem] md:px-7" type="submit"><Search size={18} /> Search</button>
    </form>
  );
}
