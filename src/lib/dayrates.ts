import { db } from "./db";
import { parseUTC, utcISO } from "./utils";
import type { DayRates } from "./pricing";

export async function getDayRates(stayId: string, from: string, to: string): Promise<DayRates> {
  const rows = await db.dayRate.findMany({ where: { stayId, date: { gte: parseUTC(from), lte: parseUTC(to) } } });
  return Object.fromEntries(rows.map((r) => [utcISO(r.date), { price: r.price, minNights: r.minNights }]));
}
