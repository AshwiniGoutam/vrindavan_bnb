import { db } from "@/lib/db";
import { getDayAvailability } from "@/lib/availability";
import { getDayRates } from "@/lib/dayrates";
import { nightlyPrice } from "@/lib/pricing";
import { addDaysISO, isISODate, nightsBetween, todayIST } from "@/lib/utils";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { cors, v1json } from "@/lib/v1";

export const OPTIONS = () => new Response(null, { status: 204, headers: cors });

// GET /api/v1/stays/:slug/availability?from=YYYY-MM-DD&to=YYYY-MM-DD   (max 366 nights)
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!rateLimit(`v1a:${clientIp(req)}`, 60, 60_000)) return v1json({ error: "Rate limit exceeded" }, { status: 429 });
  const { slug } = await params;
  const stay = await db.stay.findFirst({ where: { slug, published: true } });
  if (!stay) return v1json({ error: "Not found" }, { status: 404 });

  const sp = new URL(req.url).searchParams;
  const from = sp.get("from") ?? todayIST();
  const to = sp.get("to") ?? addDaysISO(from, 59);
  if (!isISODate(from) || !isISODate(to) || to < from || nightsBetween(from, to) > 366) {
    return v1json({ error: "Use from and to as YYYY-MM-DD, at most 366 nights apart." }, { status: 400 });
  }
  const [days, rates] = await Promise.all([getDayAvailability(stay.id, from, to), getDayRates(stay.id, from, to)]);
  return v1json({
    data: days.map((d) => ({
      date: d.date, available: d.value === 1, price: nightlyPrice(stay, d.date, rates),
      minNights: Math.max(stay.minNights, rates[d.date]?.minNights ?? 0),
    })),
  }, { cache: "public, s-maxage=30" });
}
