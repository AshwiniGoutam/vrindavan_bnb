import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { cancelBooking } from "@/lib/booking-service";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (!rateLimit(`cancel:${user.id}`, 5, 10 * 60_000)) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  const { id } = await params;
  const b = await db.booking.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!b) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  const r = await cancelBooking({ bookingId: id, actor: "guest" });
  return r.ok ? NextResponse.json({ ok: true, refundAmount: r.refundAmount }) : NextResponse.json({ error: r.error }, { status: 400 });
}
