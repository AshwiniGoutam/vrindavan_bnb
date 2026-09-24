import { z } from "zod";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-keys";
import { createManualBooking } from "@/lib/booking-service";
import { utcISO } from "@/lib/utils";
import { cors, v1json } from "@/lib/v1";

export const OPTIONS = () => new Response(null, { status: 204, headers: cors });

const serialize = (b: Awaited<ReturnType<typeof db.booking.findMany>>[number]) => ({
  id: b.id, code: b.code, stayId: b.stayId, source: b.source, status: b.status, paymentStatus: b.paymentStatus,
  checkIn: utcISO(b.checkIn), checkOut: utcISO(b.checkOut), nights: b.nights, guests: b.guests, total: b.total,
  guest: { name: b.guestName, email: b.guestEmail, phone: b.guestPhone }, createdAt: b.createdAt,
});

// Requires an API key (Admin > Settings): header  X-Api-Key: kth_...   or   Authorization: Bearer kth_...
// GET /api/v1/bookings?status=&from=YYYY-MM-DD&limit=
export async function GET(req: Request) {
  if (!(await authenticateApiKey(req))) return v1json({ error: "Invalid or missing API key" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status");
  const limit = Math.min(200, Math.max(1, parseInt(sp.get("limit") ?? "50", 10) || 50));
  const rows = await db.booking.findMany({
    where: { ...(status && ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"].includes(status) ? { status: status as "PENDING" } : {}) },
    orderBy: { createdAt: "desc" }, take: limit,
  });
  return v1json({ data: rows.map(serialize) });
}

const createSchema = z.object({
  stayId: z.string(), checkIn: z.string(), checkOut: z.string(), guests: z.number().int().min(1),
  guestName: z.string().min(2), guestPhone: z.string().default(""), guestEmail: z.string().default(""),
  total: z.number().int().positive().optional(), paid: z.boolean().default(false),
  source: z.enum(["MANUAL", "AIRBNB", "BOOKING_COM", "MAKEMYTRIP", "OTHER"]).default("OTHER"), notes: z.string().max(500).optional(),
});

// POST /api/v1/bookings: lets another system (your own app, a partner, a Zapier flow) create a confirmed
// booking. It's availability-checked, so it can't double-book, and it updates connected channels.
export async function POST(req: Request) {
  if (!(await authenticateApiKey(req))) return v1json({ error: "Invalid or missing API key" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return v1json({ error: parsed.error.issues[0].message }, { status: 400 });
  const r = await createManualBooking(parsed.data);
  return r.ok ? v1json({ data: { id: r.id } }, { status: 201 }) : v1json({ error: r.error }, { status: 409 });
}
