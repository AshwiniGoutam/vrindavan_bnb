"use client";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

const topics = [
  ["stay", "Help choosing a stay"], ["group", "Group or corporate stay"],
  ["list-property", "List my property"], ["other", "Something else"],
] as const;

export default function EnquiryForm({ defaultTopic = "stay", stayId }: { defaultTopic?: string; stayId?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("busy"); setError("");
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const res = await fetch("/api/enquiries", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, stayId, guests: f.guests ? Number(f.guests) : undefined, checkIn: f.checkIn || undefined, checkOut: f.checkOut || undefined }),
    });
    if (res.ok) return setState("done");
    const d = await res.json().catch(() => ({}));
    setError(d.error ?? "Couldn't send. Please try again."); setState("idle");
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl bg-emerald-50 p-8 text-emerald-900">
        <CheckCircle2 className="mb-3" />
        <h2 className="font-sans text-xl font-semibold">Thanks, we've got it</h2>
        <p className="mt-1">Our team will reply on WhatsApp or email within a few hours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div><label className="label" htmlFor="topic">How can we help?</label>
        <select id="topic" name="topic" defaultValue={defaultTopic} className="field">{topics.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="ename">Name</label><input id="ename" name="name" className="field" required /></div>
        <div><label className="label" htmlFor="ephone">Mobile number</label><input id="ephone" name="phone" type="tel" className="field" required /></div>
      </div>
      <div><label className="label" htmlFor="eemail">Email</label><input id="eemail" name="email" type="email" className="field" required /></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className="label" htmlFor="ci">Check-in (optional)</label><input id="ci" name="checkIn" type="date" className="field" /></div>
        <div><label className="label" htmlFor="co">Check-out (optional)</label><input id="co" name="checkOut" type="date" className="field" /></div>
        <div><label className="label" htmlFor="g">Guests</label><input id="g" name="guests" type="number" min={1} max={100} className="field" /></div>
      </div>
      <div><label className="label" htmlFor="msg">Message</label><textarea id="msg" name="message" rows={4} className="field" placeholder="Where, when and who's coming? Anything special you need?" required /></div>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <button className="btn btn-primary" disabled={state === "busy"}>{state === "busy" ? "Sending…" : "Send enquiry"}</button>
    </form>
  );
}
