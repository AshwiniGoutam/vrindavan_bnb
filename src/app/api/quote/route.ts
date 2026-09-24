import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveQuote } from "@/lib/quote-service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const stay = body?.stayId ? await db.stay.findFirst({ where: { id: String(body.stayId), published: true } }) : null;
  if (!stay) return NextResponse.json({ error: "Stay not found" }, { status: 404 });
  const r = await resolveQuote({ stay, checkIn: body.checkIn, checkOut: body.checkOut, guests: body.guests, couponCode: body.coupon });
  return r.ok ? NextResponse.json({ quote: r.quote }) : NextResponse.json({ error: r.error }, { status: r.status });
}
