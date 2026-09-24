import { Star } from "lucide-react";
import { db } from "@/lib/db";
import { replyReview, toggleReview } from "../more-actions";
import { formatDate, utcISO } from "@/lib/utils";

export const metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

export default async function AdminReviews() {
  const reviews = await db.review.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { stay: { select: { title: true } }, user: { select: { name: true } } } });
  return (
    <div>
      <h1 className="text-3xl">Reviews</h1>
      <p className="mt-2 text-stone">Guests can review a stay after check-out. Hide anything abusive or fake. Ratings on the site update automatically.</p>
      <ul className="mt-6 grid gap-4">
        {reviews.map((r) => (
          <li key={r.id} className={`rounded-2xl bg-white p-5 shadow-sm ${r.published ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{r.stay.title} <span className="font-normal text-stone">· {r.user?.name ?? "Guest"} · {formatDate(utcISO(r.createdAt))}</span></p>
                <p className="mt-1 flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={16} className={i < r.rating ? "fill-marigold text-marigold" : "text-line"} />)}</p>
              </div>
              <form action={toggleReview}><input type="hidden" name="id" value={r.id} /><button className="btn btn-ghost !py-2 text-sm">{r.published ? "Hide" : "Show"}</button></form>
            </div>
            <p className="mt-3">{r.comment}</p>
            <form action={replyReview} className="mt-4 flex gap-2">
              <input type="hidden" name="id" value={r.id} />
              <input name="reply" defaultValue={r.hostReply ?? ""} placeholder="Reply as the host (shown publicly)" className="field !py-2 text-sm" aria-label="Host reply" />
              <button className="btn btn-primary !py-2 text-sm">Save reply</button>
            </form>
          </li>
        ))}
        {reviews.length === 0 && <li className="rounded-2xl bg-white p-10 text-center text-stone">No reviews yet.</li>}
      </ul>
    </div>
  );
}
