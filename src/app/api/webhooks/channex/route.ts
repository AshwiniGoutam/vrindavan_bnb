import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { background } from "@/lib/background";
import { pullBookings } from "@/lib/channex";

// Channex -> us. Set the webhook URL in Channex to:
//   https://YOURDOMAIN/api/webhooks/channex?secret=YOUR_CHANNEX_WEBHOOK_SECRET
// with events: booking (new, modified, cancelled). We don't trust the payload, we simply pull the
// booking revision feed and acknowledge what we store.
export async function POST(req: Request) {
  const expected = process.env.CHANNEX_WEBHOOK_SECRET ?? "";
  const given = new URL(req.url).searchParams.get("secret") ?? "";
  const a = Buffer.from(expected), b = Buffer.from(given);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  background(() => pullBookings());
  return NextResponse.json({ ok: true });
}
