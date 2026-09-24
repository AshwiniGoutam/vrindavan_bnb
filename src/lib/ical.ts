import { db } from "./db";
import { channexEnabled, pushAvailability } from "./channex";
import { parseIcs } from "./ical-format";
import { addDaysISO, parseUTC, todayIST } from "./utils";

export { buildCalendar, parseIcs } from "./ical-format";

export async function syncFeed(feedId: string) {
  const feed = await db.icalFeed.findUnique({ where: { id: feedId } });
  if (!feed) return { ok: false, error: "Feed not found" };
  try {
    const url = new URL(feed.url);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Feed URL must be http(s)");
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`Feed responded ${res.status}`);
    const events = parseIcs(await res.text());
    await db.$transaction([
      db.externalBlock.deleteMany({ where: { feedId } }),
      db.externalBlock.createMany({
        data: events.map((e) => ({
          stayId: feed.stayId, feedId, start: parseUTC(e.start), end: parseUTC(e.end),
          source: feed.name, summary: e.summary.slice(0, 120),
        })),
      }),
      db.icalFeed.update({ where: { id: feedId }, data: { lastSyncedAt: new Date(), lastError: null } }),
    ]);
    // If this stay is also connected to a channel manager, tell it what changed.
    if (channexEnabled()) await pushAvailability(feed.stayId, todayIST(), addDaysISO(todayIST(), 364));
    return { ok: true, count: events.length };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Sync failed";
    await db.icalFeed.update({ where: { id: feedId }, data: { lastError: error } });
    return { ok: false, error };
  }
}

export async function syncAllFeeds() {
  const feeds = await db.icalFeed.findMany({ select: { id: true } });
  const results = await Promise.all(feeds.map((f) => syncFeed(f.id)));
  return { total: feeds.length, failed: results.filter((r) => !r.ok).length };
}
