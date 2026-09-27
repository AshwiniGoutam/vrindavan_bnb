"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import type { AddOnDTO } from "@/server/types";
import { getAttribution } from "@/lib/analytics/client";
import { formatINR } from "@/lib/money";
import { Counter, QuoteSummary, Steps, postJSON, useQuote, type ApiError, type QuoteBody } from "./shared";
import { launchPayment, type CheckoutSession } from "./pay";

interface Props {
  vertical: "stay" | "darshan";
  request: Record<string, unknown> & { specialRequests?: string; addOns?: { id: string; qty: number }[] };
  title: string;
  subtitle: string;
  backHref: string;
  pickupPoints?: string[];
  policySummary?: string;
  /** Darshan: add-ons are chosen in step 3 */
  addOns?: AddOnDTO[];
}

const STAY_STEPS = ["Dates", "Stay", "Your details", "Payment", "Confirmed"];
const TOUR_STEPS = ["Journey", "Your details", "Add-ons & details", "Payment", "Confirmed"];

/**
 * Stay: step 3 (guest details) → step 4 payment.
 * Darshan: step 2 (guest details) → step 3 (add-ons, pickup, requests) → step 4 payment.
 * Prices are always recomputed by the server.
 */
export function CheckoutClient({ vertical, request, title, subtitle, backHref, pickupPoints, policySummary, addOns = [] }: Props) {
  const { specialRequests: initialRequests, addOns: initialAddOns, ...baseRequest } = request;
  const isTour = vertical === "darshan";
  const [phase, setPhase] = useState<"details" | "extras">("details");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>();
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries((initialAddOns ?? []).map((a) => [a.id, a.qty])));
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "", gstin: "", specialRequests: initialRequests ?? "", pickupPoint: pickupPoints?.[0] ?? "", acceptTerms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [mockPrompt, setMockPrompt] = useState<((ok: boolean) => void) | null>(null);

  const addOnList = Object.entries(qty).filter(([, q]) => q > 0).map(([id, q]) => ({ id, qty: q }));
  const quoteRequest = useMemo(
    () => ({ ...baseRequest, addOns: addOnList, couponCode: appliedCoupon }),
    [JSON.stringify(baseRequest), JSON.stringify(addOnList), appliedCoupon], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const { quote, error, loading } = useQuote({ vertical, request: quoteRequest } as QuoteBody, 150);

  const steps = isTour ? TOUR_STEPS : STAY_STEPS;
  const step = busy ? 4 : isTour ? (phase === "details" ? 2 : 3) : 3;
  const showExtras = !isTour || phase === "extras";
  const showDetails = !isTour || phase === "details";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase]);

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  function validateDetails() {
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "Please enter your full name";
    if (!/^\+?[\d\s-]{10,15}$/.test(form.phone.trim())) errs.phone = "Enter a valid mobile number";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Enter a valid email";
    if (form.gstin && !/^[0-9A-Za-z]{15}$/.test(form.gstin.trim())) errs.gstin = "GSTIN must be 15 characters";
    return errs;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isTour && phase === "details") {
      const errs = validateDetails();
      setErrors(errs);
      if (!Object.keys(errs).length) setPhase("extras");
      return;
    }
    const errs = validateDetails();
    if (!form.acceptTerms) errs.acceptTerms = "Please accept the terms to continue";
    setErrors(errs);
    if (Object.keys(errs).length) {
      if (isTour && Object.keys(errs).some((k) => k !== "acceptTerms")) setPhase("details");
      return;
    }

    setBusy(true);
    setSubmitError(null);
    const res = await postJSON<CheckoutSession>("/api/bookings", {
      vertical,
      request: quoteRequest,
      guest: { name: form.name, phone: form.phone, email: form.email, city: form.city || undefined, gstin: form.gstin || undefined },
      specialRequests: form.specialRequests || undefined,
      pickupPoint: isTour ? form.pickupPoint || undefined : undefined,
      attribution: getAttribution(),
      acceptTerms: true,
    });
    if (!res.ok) {
      setBusy(false);
      setSubmitError(res.error);
      if (res.error.fields) {
        const mapped = Object.fromEntries(Object.entries(res.error.fields).map(([k, v]) => [k.replace(/^guest\./, ""), v]));
        setErrors(mapped);
        if (isTour && ["name", "phone", "email", "gstin", "city"].some((k) => mapped[k])) setPhase("details");
      }
      return;
    }
    try {
      await launchPayment(res.data, { onMockPrompt: () => new Promise<boolean>((resolve) => setMockPrompt(() => resolve)) });
    } catch (err) {
      setSubmitError({ code: "PAYMENT", message: (err as Error).message });
      window.location.assign(`/booking/${res.data.bookingCode}?payment=pending`);
    }
  }

  return (
    <div className="container-x grid gap-12 pb-24 pt-32 lg:grid-cols-12 lg:pt-36">
      <div className="lg:col-span-7">
        {isTour && phase === "extras" ? (
          <button type="button" onClick={() => setPhase("details")} className="inline-flex items-center gap-2 text-sm text-muted hover:text-charcoal">
            <ArrowLeft className="h-4 w-4" /> Your details
          </button>
        ) : (
          <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-muted hover:text-charcoal">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        )}
        <h1 className="display mt-6 text-5xl text-ink md:text-6xl">{isTour && phase === "extras" ? "Make it yours." : "Almost there."}</h1>
        <div className="mt-6">
          <Steps current={step} steps={steps} />
        </div>
        <p className="mt-6 text-sm text-muted">No account or login needed — your booking ID and confirmation are sent to your WhatsApp and email, and you can reopen your booking any time from that link.</p>

        <form onSubmit={submit} className="mt-10 space-y-6" noValidate>
          {showDetails ? (
            <div className="grid gap-5 md:grid-cols-2">
              <label className="field md:col-span-2">
                <span className="field-label">Full name (lead guest)</span>
                <input className="input" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} />
                {errors.name ? <span className="text-xs text-danger">{errors.name}</span> : null}
              </label>
              <label className="field">
                <span className="field-label">Mobile (WhatsApp)</span>
                <input className="input" inputMode="tel" autoComplete="tel" placeholder="+91" value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors.phone} />
                {errors.phone ? <span className="text-xs text-danger">{errors.phone}</span> : null}
              </label>
              <label className="field">
                <span className="field-label">Email (for your confirmation)</span>
                <input className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} />
                {errors.email ? <span className="text-xs text-danger">{errors.email}</span> : null}
              </label>
              <label className="field">
                <span className="field-label">City</span>
                <input className="input" autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">GSTIN (optional, for business invoice)</span>
                <input className="input uppercase" maxLength={15} value={form.gstin} onChange={(e) => set("gstin", e.target.value)} aria-invalid={!!errors.gstin} />
                {errors.gstin ? <span className="text-xs text-danger">{errors.gstin}</span> : null}
              </label>
            </div>
          ) : null}

          {showExtras ? (
            <div className="space-y-6">
              {isTour && addOns.length ? (
                <fieldset className="border hairline bg-paper px-5 py-2">
                  <legend className="field-label px-1">Add-ons</legend>
                  <div className="divide-y hairline">
                    {addOns.map((a) => (
                      <Counter
                        key={a._id}
                        label={a.name}
                        hint={a.pricingUnit === "on_request" || !a.price ? "Arranged on request" : `${formatINR(a.price)} ${a.pricingUnit.replace("per_", "per ").replace("_", " ")}${a.description ? ` · ${a.description}` : ""}`}
                        value={qty[a._id] ?? 0}
                        min={0}
                        max={a.pricingUnit === "per_person" || a.pricingUnit === "per_booking" || a.pricingUnit === "on_request" ? 1 : a.maxQty ?? 10}
                        onChange={(v) => setQty((q) => ({ ...q, [a._id]: v }))}
                      />
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {isTour && pickupPoints?.length ? (
                <label className="field">
                  <span className="field-label">Pickup point</span>
                  <select className="input" value={form.pickupPoint} onChange={(e) => set("pickupPoint", e.target.value)}>
                    {pickupPoints.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
              ) : null}

              <label className="field">
                <span className="field-label">{isTour ? "Travel details & special requests" : "Special requests"}</span>
                <textarea className="input min-h-24" maxLength={1000} value={form.specialRequests} onChange={(e) => set("specialRequests", e.target.value)} placeholder={isTour ? "Train / flight details, elderly guests, dietary needs…" : "Arrival time, dietary notes, celebrations…"} />
              </label>

              <label className="flex items-start gap-3 text-sm text-muted">
                <input type="checkbox" className="mt-1 accent-charcoal" checked={form.acceptTerms} onChange={(e) => set("acceptTerms", e.target.checked)} />
                <span>
                  I agree to the <Link href="/terms" className="underline" target="_blank">terms</Link> and <Link href="/cancellation-policy" className="underline" target="_blank">cancellation policy</Link>.
                  {errors.acceptTerms ? <span className="block text-xs text-danger">{errors.acceptTerms}</span> : null}
                </span>
              </label>
            </div>
          ) : null}

          {submitError ? <p className="bg-linen p-4 text-sm text-danger">{submitError.message}</p> : null}

          {isTour && phase === "details" ? (
            <button type="submit" className="btn btn-primary w-full md:w-auto">Continue</button>
          ) : (
            <>
              <button type="submit" disabled={!quote || busy || loading} className="btn btn-primary w-full md:w-auto">
                <Lock className="h-4 w-4" strokeWidth={1.5} /> {busy ? "Opening secure payment…" : quote ? `Pay ${formatINR(quote.total)}` : "Pay"}
              </button>
              <p className="flex items-center gap-2 text-xs text-muted">
                <ShieldCheck className="h-4 w-4" strokeWidth={1.4} /> Payments are processed securely by Razorpay (UPI, cards, net banking). Your {isTour ? "places are" : "dates are"} held for a few minutes while you pay.
              </p>
            </>
          )}
        </form>
      </div>

      <aside className="lg:col-span-5">
        <div className="border hairline bg-paper p-6 md:p-8 lg:sticky lg:top-28">
          <p className="eyebrow">Your booking</p>
          <h2 className="display mt-3 text-3xl text-ink">{title}</h2>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-6 border-t hairline pt-6">
            {error ? <p className="text-sm text-danger">{error.message}</p> : null}
            <QuoteSummary quote={quote} loading={loading} />
          </div>
          <div className="mt-6 flex gap-2">
            <input className="input !py-2 text-sm uppercase" placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value)} maxLength={40} />
            <button type="button" className="btn btn-outline !px-4 !py-2" onClick={() => setAppliedCoupon(coupon.trim() || undefined)}>Apply</button>
          </div>
          {policySummary ? <p className="mt-6 text-xs leading-relaxed text-muted">{policySummary}</p> : null}
        </div>
      </aside>

      {mockPrompt ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/60 p-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-ivory p-8">
            <p className="eyebrow">Development payment</p>
            <h3 className="display mt-3 text-3xl text-ink">Simulate the result</h3>
            <p className="mt-3 text-sm text-muted">PAYMENT_PROVIDER=mock — no money is charged. Add Razorpay keys to take real payments.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="btn btn-outline" onClick={() => { mockPrompt(false); setMockPrompt(null); }}>Fail</button>
              <button className="btn btn-primary" onClick={() => { mockPrompt(true); setMockPrompt(null); }}>Succeed</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
