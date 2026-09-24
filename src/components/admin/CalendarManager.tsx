"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import type { DayCell } from "@/lib/calendar-pure";
import { addBookingAction, blockDatesAction, cancelFromCalendarAction, setRatesAction, unblockAction } from "@/app/admin/calendar-actions";
import { inr } from "@/lib/utils";
import { sourceColor } from "@/lib/source-style";

export type Detail =
  | { type: "booking"; id: string; code: string; guestName: string; source: string; status: string; paymentStatus: string; checkIn: string; checkOut: string; total: number; guests: number; cancellable: boolean }
  | { type: "block"; id: string; source: string; start: string; end: string; summary: string | null; removable: boolean };

const short = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n));
const fmt = (iso: string) => new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
const addDay = (iso: string, n: number) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 864e5).toISOString().slice(0, 10);
const sourceLabel: Record<string, string> = { DIRECT: "Website", MANUAL: "Manual", AIRBNB: "Airbnb", BOOKING_COM: "Booking.com", MAKEMYTRIP: "MakeMyTrip", OTHER: "Other" };

export default function CalendarManager(props: {
  stayId: string; month: string; today: string; leading: number; cells: DayCell[]; details: Record<string, Detail>;
}) {
  const { stayId, month, today, leading, cells, details } = props;
  const [anchor, setAnchor] = useState<string | null>(null);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [tab, setTab] = useState<"booking" | "block">("booking");

  function pick(date: string) {
    if (anchor) {
      setRange(date < anchor ? { from: date, to: anchor } : { from: anchor, to: date });
      setAnchor(null);
    } else {
      setAnchor(date);
      setRange({ from: date, to: date });
    }
  }

  const sel = useMemo(() => (range ? cells.filter((c) => c.date >= range.from && c.date <= range.to) : []), [cells, range]);
  const refs = useMemo(() => [...new Set(sel.filter((c) => c.refId).map((c) => c.refId!))], [sel]);
  const allFree = sel.length > 0 && sel.every((c) => c.kind === "free");
  const estimate = sel.reduce((s, c) => s + c.price, 0);
  const hidden = range && (
    <>
      <input type="hidden" name="stayId" value={stayId} />
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="from" value={range.from} />
      <input type="hidden" name="to" value={range.to} />
    </>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-stone" aria-hidden="true">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1" role="grid" aria-label="Availability calendar">
          {Array.from({ length: leading }, (_, i) => <div key={`b${i}`} />)}
          {cells.map((c, idx) => {
            const col = (leading + idx) % 7;
            const selected = range && c.date >= range.from && c.date <= range.to;
            const occupied = c.kind !== "free";
            const color = c.kind === "booking" ? sourceColor(c.source) : c.kind === "channel" ? sourceColor(c.source) : c.kind === "blocked" ? "bg-slate-300 text-slate-800" : "bg-white text-pine";
            return (
              <button
                key={c.date} type="button" onClick={() => pick(c.date)} role="gridcell" aria-selected={!!selected}
                aria-label={`${fmt(c.date)}, ${occupied ? `${c.kind} ${c.label ?? ""}` : "available"}, ${inr(c.price)}`}
                className={`relative flex h-[76px] flex-col justify-between overflow-hidden rounded-lg border p-1.5 text-left text-xs transition-shadow ${color} ${occupied ? "border-transparent" : "border-line hover:border-lake"} ${selected ? "ring-2 ring-marigold ring-offset-1" : ""} ${c.date < today ? "opacity-60" : ""} ${c.conflict ? "outline-2 outline-red-600 outline-offset-1 outline" : ""}`}
              >
                <span className="flex items-start justify-between">
                  <span className={`font-semibold ${c.date === today ? "rounded-full bg-marigold px-1.5 text-pine" : ""}`}>{Number(c.date.slice(8))}</span>
                  {c.conflict && <AlertTriangle size={13} className="text-red-100" aria-label="Double booking" />}
                </span>
                {occupied && (c.isFirst || col === 0) && <span className="truncate text-[11px] font-medium leading-tight">{c.label}</span>}
                <span className={`flex items-center justify-between text-[11px] ${occupied ? "opacity-80" : "text-stone"}`}>
                  <span>{c.overridden ? "•" : ""}₹{short(c.price)}</span>
                  {c.minNights ? <span>min {c.minNights}</span> : null}
                </span>
              </button>
            );
          })}
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-stone" aria-label="Legend">
          {[["Website", "bg-pine"], ["Manual", "bg-lake"], ["Airbnb", "bg-rose-500"], ["Booking.com", "bg-blue-600"], ["MakeMyTrip", "bg-orange-500"], ["Other channel", "bg-slate-500"], ["Blocked", "bg-slate-300"]].map(([l, c]) => (
            <li key={l} className="flex items-center gap-1.5"><span className={`size-3 rounded ${c}`} /> {l}</li>
          ))}
          <li className="flex items-center gap-1.5"><span className="size-3 rounded outline outline-2 outline-red-600" /> Double booking</li>
          <li>• = custom price</li>
        </ul>
        <p className="mt-2 text-xs text-stone">Each square is a night. Click a night, then click another to select a range.</p>
      </div>

      <aside className="xl:sticky xl:top-24 xl:self-start" aria-live="polite">
        {!range ? (
          <div className="rounded-2xl border border-dashed border-line bg-white p-6 text-sm text-stone">
            Select a night, or a range, to add a booking, block dates, or change prices.
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{range.from === range.to ? fmt(range.from) : `${fmt(range.from)} to ${fmt(range.to)}`}</p>
                <p className="text-xs text-stone">{sel.length} night{sel.length > 1 ? "s" : ""} · check-out {fmt(addDay(range.to, 1))}</p>
              </div>
              <button type="button" className="rounded-lg p-1.5 hover:bg-mist" onClick={() => { setRange(null); setAnchor(null); }} aria-label="Clear selection"><X size={16} /></button>
            </div>
            {anchor && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Click a second night to finish the range, or use just this night.</p>}

            {refs.map((r) => {
              const d = details[r];
              if (!d) return null;
              return d.type === "booking" ? (
                <div key={r} className="mt-4 rounded-xl border border-line p-4 text-sm">
                  <div className="flex items-center justify-between gap-2"><p className="font-semibold">{d.guestName}</p><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${sourceColor(d.source)}`}>{sourceLabel[d.source] ?? d.source}</span></div>
                  <p className="text-stone">{d.code} · {d.guests} guest{d.guests > 1 ? "s" : ""} · {fmt(d.checkIn)} to {fmt(d.checkOut)}</p>
                  <p className="mt-1">{inr(d.total)} · <span className="capitalize">{d.paymentStatus.toLowerCase()}</span> · <span className="capitalize">{d.status.toLowerCase()}</span></p>
                  {d.cancellable && (
                    <form action={cancelFromCalendarAction} className="mt-3 grid gap-2 border-t border-line pt-3">
                      <input type="hidden" name="stayId" value={stayId} /><input type="hidden" name="month" value={month} />
                      <input type="hidden" name="from" value={range.from} /><input type="hidden" name="to" value={range.to} />
                      <input type="hidden" name="bookingId" value={d.id} />
                      {d.source === "DIRECT" && d.paymentStatus === "PAID" && (
                        <select name="refundMode" className="field !py-2 text-sm" aria-label="Refund">
                          <option value="policy">Refund per cancellation policy</option>
                          <option value="full">Refund in full</option>
                          <option value="none">No refund</option>
                        </select>
                      )}
                      <button className="btn btn-ghost !border-red-300 !py-2 text-sm !text-red-700 hover:!bg-red-600 hover:!text-white" onClick={(e) => { if (!confirm(`Cancel booking ${d.code}?`)) e.preventDefault(); }}>Cancel this booking</button>
                      {d.source !== "DIRECT" && d.source !== "MANUAL" && <p className="text-xs text-stone">This came from {sourceLabel[d.source] ?? d.source}. Cancelling here only frees the dates on your side. Cancel it on that platform too.</p>}
                    </form>
                  )}
                </div>
              ) : (
                <div key={r} className="mt-4 rounded-xl border border-line p-4 text-sm">
                  <p className="font-semibold">{d.removable ? "Blocked by you" : `Blocked by ${d.source}`}</p>
                  <p className="text-stone">{d.summary}</p>
                  {d.removable ? (
                    <form action={unblockAction} className="mt-3">
                      <input type="hidden" name="stayId" value={stayId} /><input type="hidden" name="month" value={month} />
                      <input type="hidden" name="from" value={range.from} /><input type="hidden" name="to" value={range.to} />
                      <input type="hidden" name="blockId" value={d.id} />
                      <button className="btn btn-ghost !py-2 text-sm">Remove block</button>
                    </form>
                  ) : <p className="mt-2 text-xs text-stone">This comes from a synced calendar. Change it on that channel, or remove the feed in <Link href="/admin/channels" className="underline">Channels</Link>.</p>}
                </div>
              );
            })}

            {allFree && (
              <div className="mt-4">
                <div className="flex rounded-full bg-mist p-1 text-sm font-semibold" role="tablist">
                  {(["booking", "block"] as const).map((t) => (
                    <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex-1 rounded-full py-1.5 ${tab === t ? "bg-white shadow-sm" : "text-stone"}`}>{t === "booking" ? "Add booking" : "Block dates"}</button>
                  ))}
                </div>

                {tab === "booking" ? (
                  <form action={addBookingAction} className="mt-4 grid gap-3">
                    {hidden}
                    <div><label className="label" htmlFor="gn">Guest name</label><input id="gn" name="guestName" className="field !py-2 text-sm" required /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="label" htmlFor="gp">Phone</label><input id="gp" name="guestPhone" type="tel" className="field !py-2 text-sm" /></div>
                      <div><label className="label" htmlFor="gg">Guests</label><input id="gg" name="guests" type="number" min={1} defaultValue={2} className="field !py-2 text-sm" /></div>
                    </div>
                    <div><label className="label" htmlFor="ge">Email (optional, sends confirmation)</label><input id="ge" name="guestEmail" type="email" className="field !py-2 text-sm" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="label" htmlFor="gs">Source</label>
                        <select id="gs" name="source" className="field !py-2 text-sm"><option value="MANUAL">Phone / walk-in</option><option value="AIRBNB">Airbnb</option><option value="BOOKING_COM">Booking.com</option><option value="MAKEMYTRIP">MakeMyTrip</option><option value="OTHER">Other</option></select></div>
                      <div><label className="label" htmlFor="gt">Total (₹)</label><input id="gt" name="total" type="number" min={1} placeholder={String(estimate)} className="field !py-2 text-sm" /></div>
                    </div>
                    <p className="-mt-1 text-xs text-stone">Leave the total empty to use the site's price with taxes (about {inr(estimate)} before GST and extras).</p>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="paid" /> Already paid</label>
                    <div><label className="label" htmlFor="gnotes">Notes</label><input id="gnotes" name="notes" className="field !py-2 text-sm" /></div>
                    <button className="btn btn-primary !py-2.5">Add booking</button>
                  </form>
                ) : (
                  <form action={blockDatesAction} className="mt-4 grid gap-3">
                    {hidden}
                    <div><label className="label" htmlFor="bn">Reason (only you see this)</label><input id="bn" name="note" placeholder="Maintenance, owner stay…" className="field !py-2 text-sm" /></div>
                    <button className="btn btn-primary !py-2.5">Block these nights</button>
                    <p className="text-xs text-stone">Blocked nights disappear from your site and connected channels.</p>
                  </form>
                )}
              </div>
            )}

            <form action={setRatesAction} className="mt-5 grid gap-3 border-t border-line pt-4">
              {hidden}
              <p className="text-sm font-semibold">Price and rules for {sel.length > 1 ? "these nights" : "this night"}</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label" htmlFor="rp">Price per night (₹)</label><input id="rp" name="price" type="number" min={1} placeholder={sel[0] ? String(sel[0].price) : ""} className="field !py-2 text-sm" /></div>
                <div><label className="label" htmlFor="rm">Minimum nights</label><input id="rm" name="minNights" type="number" min={0} placeholder="Default" className="field !py-2 text-sm" /></div>
              </div>
              <div className="flex gap-2">
                <button name="intent" value="apply" className="btn btn-ghost flex-1 !py-2 text-sm">Apply</button>
                <button name="intent" value="reset" className="btn btn-ghost flex-1 !py-2 text-sm">Reset to standard</button>
              </div>
              <p className="text-xs text-stone">Leave a box empty to keep it as is. Minimum 0 removes the extra rule.</p>
            </form>
          </div>
        )}
      </aside>
    </div>
  );
}
