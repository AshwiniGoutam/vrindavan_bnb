"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { getAttribution, trackLead } from "@/lib/analytics/client";
import { postJSON, type ApiError } from "./shared";

export function EnquiryForm({ type = "general", tourSlug, propertySlug, subject, compact }: { type?: "tour" | "custom_tour" | "stay" | "general" | "advance_window"; tourSlug?: string; propertySlug?: string; subject?: string; compact?: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<ApiError | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    setError(null);
    const res = await postJSON("/api/enquiries", {
      type,
      tourSlug,
      propertySlug,
      subject,
      name: f.get("name"),
      phone: f.get("phone"),
      email: f.get("email") || "",
      travelDate: f.get("travelDate") || "",
      people: f.get("people") ? Number(f.get("people")) : undefined,
      message: f.get("message") || undefined,
      website: f.get("website") || undefined,
      attribution: getAttribution(),
    });
    if (res.ok) {
      setState("sent");
      trackLead(subject ?? "Enquiry");
    } else {
      setState("idle");
      setError(res.error);
    }
  }

  if (state === "sent")
    return (
      <div className="flex items-start gap-3 bg-linen p-5 text-sm">
        <Check className="mt-0.5 h-5 w-5 text-success" />
        <p>Thank you — we&apos;ve received your enquiry and will reach out on WhatsApp or phone shortly. Radhe Radhe!</p>
      </div>
    );

  const err = (k: string) => error?.fields?.[k];
  return (
    <form onSubmit={submit} className={compact ? "space-y-4" : "grid gap-5 md:grid-cols-2"} noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="field">
        <span className="field-label">Name</span>
        <input name="name" required className="input" autoComplete="name" aria-invalid={!!err("name")} />
        {err("name") ? <span className="text-xs text-danger">{err("name")}</span> : null}
      </label>
      <label className="field">
        <span className="field-label">Mobile / WhatsApp</span>
        <input name="phone" required inputMode="tel" className="input" autoComplete="tel" aria-invalid={!!err("phone")} />
        {err("phone") ? <span className="text-xs text-danger">{err("phone")}</span> : null}
      </label>
      {!compact ? (
        <label className="field">
          <span className="field-label">Email (optional)</span>
          <input name="email" type="email" className="input" autoComplete="email" />
        </label>
      ) : null}
      <div className={compact ? "grid grid-cols-2 gap-3" : "contents"}>
        <label className="field">
          <span className="field-label">Travel date</span>
          <input name="travelDate" type="date" className="input" />
        </label>
        <label className="field">
          <span className="field-label">People</span>
          <input name="people" type="number" min={1} max={200} className="input" />
        </label>
      </div>
      <label className={compact ? "field" : "field md:col-span-2"}>
        <span className="field-label">Message</span>
        <textarea name="message" className="input min-h-24" maxLength={2000} />
      </label>
      {error && !error.fields ? <p className="text-sm text-danger">{error.message}</p> : null}
      <button type="submit" disabled={state === "sending"} className={compact ? "btn btn-primary w-full" : "btn btn-primary md:col-span-2 md:justify-self-start"}>
        {state === "sending" ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
