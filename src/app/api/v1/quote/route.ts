import { db } from "@/lib/db";
import { resolveQuote } from "@/lib/quote-service";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { cors, v1json } from "@/lib/v1";

export const OPTIONS = () => new Response(null, { status: 204, headers: cors });

// POST /api/v1/quote  { slug, checkIn, checkOut, guests, coupon? }
export async function POST(req: Request) {
  if (!rateLimit(`v1q:${clientIp(req)}`, 30, 60_000)) return v1json({ error: "Rate limit exceeded" }, { status: 429 });
  const body = await req.json().catch(() => null);
  const stay = body?.slug ? await db.stay.findFirst({ where: { slug: String(body.slug), published: true } }) : null;
  if (!stay) return v1json({ error: "Stay not found" }, { status: 404 });
  const r = await resolveQuote({ stay, checkIn: body.checkIn, checkOut: body.checkOut, guests: body.guests, couponCode: body.coupon });
  return r.ok ? v1json({ data: r.quote }) : v1json({ error: r.error }, { status: r.status });
}
