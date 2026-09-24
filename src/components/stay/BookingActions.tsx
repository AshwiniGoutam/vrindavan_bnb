"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { inr } from "@/lib/utils";

export function CancelBooking({ percent, amount }: { percent: number; amount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return <button className="btn btn-ghost !border-red-300 !text-red-700 hover:!bg-red-600 hover:!text-white" onClick={() => setOpen(true)}>Cancel booking</button>;
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <p className="font-semibold text-red-900">Cancel this booking?</p>
      <p className="mt-1 text-sm text-red-900/80">
        {amount > 0 ? <>You'll get <b>{inr(amount)}</b> back ({percent}% of what you paid) to your original payment method in 5 to 7 working days.</> : "Under our cancellation policy no refund applies at this point."} This can't be undone.
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
      <div className="mt-4 flex gap-3">
        <button className="btn btn-primary !bg-red-700" disabled={busy} onClick={async () => {
          setBusy(true); setError("");
          const id = window.location.pathname.split("/").pop();
          const res = await fetch(`/api/bookings/${id}/cancel`, { method: "POST" });
          const d = await res.json().catch(() => ({}));
          if (res.ok) router.refresh(); else { setError(d.error ?? "Couldn't cancel."); setBusy(false); }
        }}>{busy ? "Cancelling…" : "Yes, cancel booking"}</button>
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>Keep booking</button>
      </div>
    </div>
  );
}

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form className="grid gap-4" onSubmit={async (e) => {
      e.preventDefault(); setError("");
      if (!rating) return setError("Choose a star rating.");
      setBusy(true);
      const comment = new FormData(e.currentTarget).get("comment");
      const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, rating, comment }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) router.refresh(); else { setError(d.error ?? "Couldn't save."); setBusy(false); }
    }}>
      <fieldset>
        <legend className="label">Your rating</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)}>
              <Star size={30} className={n <= rating ? "fill-marigold text-marigold" : "text-line"} />
            </button>
          ))}
        </div>
      </fieldset>
      <div><label className="label" htmlFor="comment">How was your stay?</label><textarea id="comment" name="comment" rows={4} minLength={10} className="field" required /></div>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <button className="btn btn-primary self-start" disabled={busy}>{busy ? "Posting…" : "Post review"}</button>
    </form>
  );
}
