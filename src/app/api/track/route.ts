import { NextResponse, type NextRequest } from "next/server";
import { trackSchema } from "@/server/validation";
import { trackServerEvent } from "@/server/services/analytics.service";
import { rateLimit } from "@/server/rate-limit";

/** First-party funnel events for the admin dashboard (GA4/Meta run in parallel in the browser). */
export async function POST(req: NextRequest) {
  try {
    await rateLimit("track", 120, 60);
    const body = trackSchema.parse(await req.json());
    await trackServerEvent(body);
  } catch {
    /* analytics must never break the page */
  }
  return new NextResponse(null, { status: 204 });
}
