import { NextResponse } from "next/server";
import { syncAllFeeds } from "@/lib/ical";
import { housekeeping } from "@/lib/booking-service";
import { fullSyncAll, pullBookings } from "@/lib/channex";

export const maxDuration = 300;

// Vercel Cron (or any scheduler) calls this with: Authorization: Bearer $CRON_SECRET
// Does: calendar (iCal) sync, expire abandoned payments, mark finished stays, pull channel bookings,
// and one full availability + rates push per day to the channel manager.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ical = await syncAllFeeds();
  const house = await housekeeping();
  const pulled = await pullBookings();
  const pushedStays = await fullSyncAll();
  return NextResponse.json({ ical, house, pulled, pushedStays });
}
