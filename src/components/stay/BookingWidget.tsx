"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { Minus, Plus } from "lucide-react";
import DateRangeField from "@/components/DateRangeField";
import { fromISO, inr, toISO } from "@/lib/utils";
import { waLink } from "@/lib/config";
import { site } from "@/lib/config";
import type { Quote } from "@/lib/pricing";

type Props = {
  stay: { id: string; slug: string; title: string; basePrice: number; maxGuests: number; minNights: number };
  unavailable: { from: string; to: string }[];
  user: { name: string; email: string; phone: string | null } | null;
  initial?: { checkIn?: string; checkOut?: string; guests?: number };
  cancelNote?: string;
};

declare global { interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void } } }

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function BookingWidget({ stay, unavailable, user, initial, cancelNote }: Props) {
  const router = useRouter();
  const [range, setRange] = useState<DateRange | undefined>(
    initial?.checkIn && initial?.checkOut ? { from: fromISO(initial.checkIn), to: fromISO(initial.checkOut) } : undefined,
  );
  const [guests, setGuests] = useState(Math.min(initial?.guests ?? 2, stay.maxGuests));
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState("");

  const checkIn = range?.from ? toISO(range.from) : "";
  const checkOut = range?.to ? toISO(range.to) : "";

  useEffect(() => {
    setQuote(null); setError("");
    if (!checkIn || !checkOut || checkIn === checkOut) return;
    const ctrl = new AbortController();
    fetch("/api/quote", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify({ stayId: stay.id, checkIn, checkOut, guests, coupon }),
    })
      .then(async (r) => { const d = await r.json(); r.ok ? setQuote(d.quote) : setError(d.error); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [checkIn, checkOut, guests, stay.id, coupon]);

  async function reserve() {
    if (!user) {
      const next = `/stays/${stay.slug}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`;
      return router.push(`/login?next=${encodeURIComponent(next)}`);
    }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stayId: stay.id, checkIn, checkOut, guests, coupon }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      if (d.demo && d.bookingId) {
        router.push(`/booking/success?id=${d.bookingId}`);
        return;
      }
      if (!(await loadRazorpay()) || !window.Razorpay) throw new Error("Couldn't load the payment window. Check your connection.");

      const rz = new window.Razorpay({
        key: d.key, amount: d.amount, currency: "INR", order_id: d.orderId,
        name: site.name, description: stay.title, prefill: d.prefill,
        theme: { color: "#12352f" },
        handler: async (resp: Record<string, string>) => {
          const v = await fetch("/api/bookings/verify", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: d.bookingId, ...resp }),
          });
          if (v.ok) router.push(`/booking/success?id=${d.bookingId}`);
          else { setError("Payment received but we couldn't confirm it yet. Don't pay again. Check My trips in a minute or message us."); setBusy(false); }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rz.on("payment.failed", () => { setError("Payment failed. You haven't been charged. Please try again."); setBusy(false); });
      rz.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  const waText = `Hi, I'm interested in ${stay.title}${checkIn ? ` from ${checkIn} to ${checkOut}` : ""} for ${guests} guests.`;

  return (
    <div className="rounded-3xl border border-line bg-white p-6 shadow-[0_20px_50px_-25px_rgba(18,53,47,.35)]">
      <p><span className="font-display text-3xl">{inr(stay.basePrice)}</span> <span className="text-stone">/ night + taxes</span></p>

      <div className="mt-5 grid gap-4">
        <DateRangeField value={range} onChange={setRange} disabledRanges={unavailable} calendarEndpoint={`/api/stays/${stay.slug}/calendar`} align="right" label="Check-in and check-out" />
        <div>
          <span className="label">Guests</span>
          <div className="flex items-center justify-between rounded-xl border-[1.5px] border-line px-3.5 py-[0.45rem]">
            <span className="text-[0.95rem]" aria-live="polite">{guests} guest{guests > 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Fewer guests" onClick={() => setGuests((g) => Math.max(1, g - 1))} className="flex size-8 items-center justify-center rounded-full border border-line hover:bg-mist"><Minus size={14} /></button>
              <button type="button" aria-label="More guests" onClick={() => setGuests((g) => Math.min(stay.maxGuests, g + 1))} className="flex size-8 items-center justify-center rounded-full border border-line hover:bg-mist"><Plus size={14} /></button>
            </div>
          </div>
          <p className="mt-1 text-xs text-stone">Up to {stay.maxGuests} guests. Minimum {stay.minNights} night{stay.minNights > 1 ? "s" : ""}.</p>
        </div>
      </div>

      <div className="mt-4">
        {coupon ? (
          <p className="flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">
            <span>Code <b>{coupon}</b> applied</span>
            <button type="button" className="underline" onClick={() => { setCoupon(""); setCouponInput(""); }}>Remove</button>
          </p>
        ) : (
          <div className="flex gap-2">
            <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Discount code" aria-label="Discount code" className="field !py-2 text-sm uppercase" />
            <button type="button" className="btn btn-ghost !px-4 !py-2 text-sm" disabled={!couponInput.trim()} onClick={() => setCoupon(couponInput.trim().toUpperCase())}>Apply</button>
          </div>
        )}
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {quote && (
        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt>{inr(Math.round(quote.stayTotal / quote.nights))} × {quote.nights} night{quote.nights > 1 ? "s" : ""}</dt><dd>{inr(quote.stayTotal)}</dd></div>
          {quote.extraGuestTotal > 0 && <div className="flex justify-between"><dt>{quote.extraGuests} extra guest{quote.extraGuests > 1 ? "s" : ""}</dt><dd>{inr(quote.extraGuestTotal)}</dd></div>}
          {quote.cleaningFee > 0 && <div className="flex justify-between"><dt>Cleaning fee</dt><dd>{inr(quote.cleaningFee)}</dd></div>}
          {quote.discount > 0 && <div className="flex justify-between text-emerald-800"><dt>Discount ({quote.couponCode})</dt><dd>-{inr(quote.discount)}</dd></div>}
          <div className="flex justify-between"><dt>GST ({Math.round(quote.taxRate * 100)}%)</dt><dd>{inr(quote.taxes)}</dd></div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd>{inr(quote.total)}</dd></div>
        </dl>
      )}

      <button onClick={reserve} disabled={!quote || busy} className="btn btn-primary mt-5 w-full">
        {busy ? "Confirming…" : !user ? "Log in to reserve" : quote ? `Pay ${inr(quote.total)} and reserve` : "Choose your dates"}
      </button>
      <a href={waLink(waText)} target="_blank" rel="noreferrer" className="btn btn-ghost mt-3 w-full">Ask a question on WhatsApp</a>
      <p className="mt-3 text-center text-xs text-stone">{cancelNote ?? "Secure payment by Razorpay. Dates are held while you check out."}</p>
    </div>
  );
}
