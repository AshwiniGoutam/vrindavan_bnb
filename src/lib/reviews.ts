import { db } from "./db";

/** Keeps Stay.rating / reviewCount in sync with published reviews. With no reviews, the manually entered values stay. */
export async function recomputeRating(stayId: string) {
  const agg = await db.review.aggregate({ where: { stayId, published: true }, _avg: { rating: true }, _count: true });
  if (agg._count > 0) {
    await db.stay.update({ where: { id: stayId }, data: { rating: Math.round((agg._avg.rating ?? 5) * 10) / 10, reviewCount: agg._count } });
  }
}
