import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { cors, publicStay, v1json } from "@/lib/v1";

export const OPTIONS = () => new Response(null, { status: 204, headers: cors });

// GET /api/v1/stays?city=&collection=&guests=&limit=
export async function GET(req: Request) {
  if (!rateLimit(`v1:${clientIp(req)}`, 60, 60_000)) return v1json({ error: "Rate limit exceeded" }, { status: 429 });
  const sp = new URL(req.url).searchParams;
  const city = sp.get("city"), collection = sp.get("collection");
  const guests = parseInt(sp.get("guests") ?? "1", 10) || 1;
  const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20));
  const stays = await db.stay.findMany({
    where: {
      published: true, maxGuests: { gte: guests },
      ...(city ? { city: { contains: city, mode: "insensitive" as const } } : {}),
      ...(collection ? { collections: { has: collection } } : {}),
    },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: limit,
  });
  return v1json({ data: stays.map(publicStay) }, { cache: "public, s-maxage=60, stale-while-revalidate=300" });
}
