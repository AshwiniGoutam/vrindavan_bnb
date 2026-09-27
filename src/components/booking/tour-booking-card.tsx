"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import type { TourDTO } from "@/server/types";
import { addDays, todayIST } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { whatsappLink } from "@/lib/utils";
import { trackBeginCheckout } from "@/lib/analytics/client";
import { ChildAges, Counter, QuoteSummary, Steps, useQuote } from "./shared";
import { EnquiryForm } from "./enquiry-form";

const ADVANCE_MESSAGE = "Online booking is unavailable for this date. Contact us on WhatsApp for availability.";

/** Darshan step 1 (tour / date / group size) + add-ons; continues to checkout or opens an enquiry. */
export function TourBookingCard({ tour, whatsapp, minGroup, advanceDays, hasAddOns }: { tour: TourDTO; whatsapp?: string; minGroup: number; advanceDays: number; hasAddOns?: boolean }) {
  const router = useRouter();
  const today = todayIST();
  const earliest = addDays(today, advanceDays);
  const [date, setDate] = useState("");
  const [adults, setAdults] = useState(Math.max(minGroup, 1));
  const [children, setChildren] = useState(0);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [mode, setMode] = useState<"book" | "enquire">(tour.bookingMode === "enquiry" ? "enquire" : "book");

  const people = adults + (tour.childrenCountTowardMinimum ? children : 0);
  const tooSoon = !!date && date < earliest;
  const belowMin = people < minGroup;
  const canQuote = mode === "book" && !!date && !tooSoon && !belowMin;
  const request = canQuote
    ? { tourSlug: tour.slug, travelDate: date, adults, children, childAges: childAges.slice(0, children), addOns: [] }
    : null;
  const { quote, error, loading } = useQuote(request ? { vertical: "darshan", request } : null);
  const waText = `Radhe Radhe! I'm interested in the ${tour.title} Darshan tour${date ? ` on ${date}` : ""} for ${adults + children} people.`;

  function book() {
    if (!request || !quote) return;
    trackBeginCheckout({ id: tour._id, name: tour.title, vertical: "darshan", value: quote.total });
    router.push(`/checkout?${new URLSearchParams({ type: "darshan", data: JSON.stringify(request) })}`);
  }

  return (
    <div id="book" className="scroll-mt-28 border hairline bg-paper p-6 md:p-7">
      <div className="flex items-baseline justify-between">
        <p>
          <span className="display text-3xl text-ink">{tour.pricing.adultPrice ? formatINR(tour.pricing.adultPrice) : "On request"}</span>
          <span className="text-sm text-muted"> / person</span>
        </p>
        {tour.pricing.compareAtPrice && tour.pricing.compareAtPrice > tour.pricing.adultPrice ? <s className="text-sm text-muted">{formatINR(tour.pricing.compareAtPrice)}</s> : null}
      </div>
      {tour.pricing.priceBasisNote ? <p className="mt-1 text-xs text-muted">{tour.pricing.priceBasisNote}</p> : null}

      {tour.bookingMode === "both" ? (
        <div className="mt-6 grid grid-cols-2 border hairline text-xs uppercase tracking-[0.14em]">
          <button type="button" onClick={() => setMode("book")} className={mode === "book" ? "bg-charcoal py-2.5 text-ivory" : "py-2.5"}>Book online</button>
          <button type="button" onClick={() => setMode("enquire")} className={mode === "enquire" ? "bg-charcoal py-2.5 text-ivory" : "py-2.5"}>Enquire</button>
        </div>
      ) : null}

      {mode === "enquire" ? (
        <div className="mt-6">
          <EnquiryForm type="tour" tourSlug={tour.slug} subject={tour.title} compact />
        </div>
      ) : (
        <>
          <div className="mt-6"><Steps current={1} steps={["Journey", "Details", "Add-ons", "Payment", "Confirmed"]} /></div>
          <label className="field mt-5">
            <span className="field-label">Travel date</span>
            <input type="date" className="input" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            <span className="text-xs text-muted">Book at least {advanceDays} days ahead · earliest {earliest}</span>
          </label>
          {tooSoon ? (
            <div className="mt-4 bg-linen p-4 text-sm text-umber">
              <p>{ADVANCE_MESSAGE}</p>
              {whatsapp ? (
                <a className="btn btn-primary mt-3 w-full" href={whatsappLink(whatsapp, waText)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> WhatsApp us
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 divide-y hairline border-y">
            <Counter label="Adults" value={adults} min={1} max={tour.maxGroupSize ?? 40} onChange={setAdults} />
            <Counter label="Children" hint={tour.pricing.childAgeMax ? `Up to ${tour.pricing.childAgeMax} yrs` : undefined} value={children} min={0} max={20} onChange={setChildren} />
            <ChildAges count={children} ages={childAges} onChange={setChildAges} />
          </div>
          {belowMin ? <p className="mt-2 text-sm text-danger">This journey needs at least {minGroup} guests per booking.</p> : <p className="mt-2 text-xs text-muted">Minimum {minGroup} guests per booking.</p>}

          <div className="mt-6">
            {error ? <p className="mb-3 text-sm text-danger">{error.message}</p> : null}
            <QuoteSummary quote={quote} loading={loading} />
          </div>
          <button type="button" onClick={book} disabled={!quote || loading} className="btn btn-primary mt-6 w-full">Continue</button>
          {hasAddOns ? <p className="mt-2 text-center text-xs text-muted">Pickup, cab and other add-ons can be added in step 3.</p> : null}
          {whatsapp ? (
            <a href={whatsappLink(whatsapp, waText)} target="_blank" rel="noopener noreferrer" className="btn btn-outline mt-3 w-full">
              <MessageCircle className="h-4 w-4" strokeWidth={1.5} /> Ask on WhatsApp
            </a>
          ) : null}
        </>
      )}
    </div>
  );
}
