import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { addDays, todayIST } from "@/lib/dates";
import { connectDB } from "@/server/db/connect";
import { Property } from "@/server/models";
import { unavailableNights } from "@/server/services/availability.service";
import { rateLimit } from "@/server/rate-limit";
import { errorResponse } from "@/server/auth/with-admin";
import { AppError } from "@/server/errors";

const q = z.object({ slug: z.string().min(1).max(120), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), days: z.coerce.number().int().min(1).max(120).default(90) });

/** Unavailable nights for the date picker. */
export async function GET(req: NextRequest) {
  try {
    await rateLimit("availability", 60, 60);
    const { slug, from, days } = q.parse(Object.fromEntries(req.nextUrl.searchParams));
    await connectDB();
    const property = await Property.findOne({ slug, "publishing.status": "published" }).lean<{ _id: unknown; status?: string; channel?: { externalPropertyId?: string; externalRoomTypeId?: string; externalRatePlanId?: string } }>();
    if (!property) throw new AppError("NOT_FOUND", "Stay not found", 404);
    const start = from ?? todayIST();
    const nights = await unavailableNights(property, start, addDays(start, days - 1));
    return NextResponse.json({ ok: true, data: { from: start, days, unavailable: nights } }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (e) {
    return errorResponse(e);
  }
}
