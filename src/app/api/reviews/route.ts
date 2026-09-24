import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { parseUTC, todayIST } from "@/lib/utils";
import { recomputeRating } from "@/lib/reviews";

const schema = z.object({
  bookingId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10, "Tell us a bit more (at least 10 characters)").max(1500),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Log in to leave a review." }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const b = await db.booking.findFirst({ where: { id: parsed.data.bookingId, userId: user.id }, include: { review: true } });
  if (!b) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (b.review) return NextResponse.json({ error: "You've already reviewed this stay." }, { status: 409 });
  // Only real, paid, finished stays can be reviewed.
  if (b.paymentStatus !== "PAID" || !["CONFIRMED", "COMPLETED"].includes(b.status) || b.checkOut > parseUTC(todayIST())) {
    return NextResponse.json({ error: "You can review a stay after check-out." }, { status: 403 });
  }
  await db.review.create({ data: { bookingId: b.id, stayId: b.stayId, userId: user.id, rating: parsed.data.rating, comment: parsed.data.comment } });
  await recomputeRating(b.stayId);
  return NextResponse.json({ ok: true });
}
