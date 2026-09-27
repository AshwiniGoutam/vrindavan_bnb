import "server-only";
import { connectDB } from "@/server/db/connect";
import { AnalyticsEvent, Booking, Property } from "@/server/models";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any;

export async function trackServerEvent(e: { type: string; sessionId?: string; vertical?: string; itemId?: string; value?: number; path?: string; utm_source?: string; utm_campaign?: string; device?: string }) {
  try {
    await connectDB();
    await AnalyticsEvent.create({ ...e, sessionId: e.sessionId ?? "server" });
  } catch (err) {
    console.warn("[analytics] track failed", err);
  }
}

const PAID = ["confirmed", "checked_in", "checked_out"];
const TZ = "Asia/Kolkata";

export interface DashboardData {
  range: { from: string; to: string };
  kpis: {
    visitors: number;
    checkoutReached: number;
    bookings: number;
    conversionRate: number;
    revenue: number;
    avgBookingValue: number;
    avgNightlyRate: number;
    repeatGuests: number;
    monthlyGrowth: number | null;
    pendingPayments: number;
  };
  monthly: { month: string; revenue: number; bookings: number }[];
  byVertical: { vertical: string; bookings: number; revenue: number }[];
  byNights: { bucket: string; bookings: number }[];
  byGuests: { bucket: string; bookings: number }[];
  properties: { name: string; bookings: number; nights: number; revenue: number }[];
  funnel: { stage: string; value: number }[];
  recent: { _id: string; code: string; guest: string; item: string; total: number; status: string; createdAt: string }[];
}

export async function getDashboard(days = 30): Promise<DashboardData> {
  await connectDB();
  const to = new Date();
  const from = new Date(Date.now() - days * 86_400_000);
  const inRange = { createdAt: { $gte: from, $lte: to } };
  const paidInRange = { ...inRange, status: { $in: PAID } };

  const [visitorsAgg, checkoutAgg, kpiAgg, repeat, pending, monthlyAgg, verticalAgg, nightsAgg, guestsAgg, propertyAgg, recent, adrAgg] = await Promise.all([
    AnalyticsEvent.aggregate([{ $match: { type: "page_view", at: { $gte: from, $lte: to } } }, { $group: { _id: "$sessionId" } }, { $count: "n" }]),
    AnalyticsEvent.aggregate([{ $match: { type: "begin_checkout", at: { $gte: from, $lte: to } } }, { $count: "n" }]),
    Booking.aggregate([{ $match: paidInRange }, { $group: { _id: null, n: { $sum: 1 }, revenue: { $sum: { $subtract: ["$amountPaid", { $ifNull: ["$amountRefunded", 0] }] } } } }]),
    Booking.countDocuments({ ...paidInRange, isRepeatGuest: true }),
    Booking.countDocuments({ status: "pending_payment" }),
    Booking.aggregate([
      { $match: { status: { $in: PAID }, createdAt: { $gte: new Date(Date.now() - 365 * 86_400_000) } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: TZ } }, revenue: { $sum: "$amountPaid" }, bookings: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Booking.aggregate([{ $match: paidInRange }, { $group: { _id: "$vertical", bookings: { $sum: 1 }, revenue: { $sum: "$amountPaid" } } }]),
    Booking.aggregate([
      { $match: { ...paidInRange, vertical: { $ne: "darshan" } } },
      { $unwind: "$items" },
      { $group: { _id: { $switch: { branches: [{ case: { $lte: ["$items.nights", 1] }, then: "1 night" }, { case: { $lte: ["$items.nights", 2] }, then: "2 nights" }, { case: { $lte: ["$items.nights", 4] }, then: "3–4 nights" }, { case: { $lte: ["$items.nights", 6] }, then: "5–6 nights" }], default: "7+ nights" } }, bookings: { $sum: 1 } } },
    ]),
    Booking.aggregate([
      { $match: paidInRange },
      { $project: { g: { $add: [{ $ifNull: [{ $arrayElemAt: ["$items.adults", 0] }, 0] }, { $ifNull: [{ $arrayElemAt: ["$items.children", 0] }, 0] }] } } },
      { $group: { _id: { $switch: { branches: [{ case: { $lte: ["$g", 2] }, then: "1–2" }, { case: { $lte: ["$g", 4] }, then: "3–4" }, { case: { $lte: ["$g", 6] }, then: "5–6" }], default: "7+" } }, bookings: { $sum: 1 } } },
    ]),
    Booking.aggregate([
      { $match: paidInRange },
      { $unwind: "$items" },
      { $match: { "items.kind": "property" } },
      { $group: { _id: "$items.propertyId", bookings: { $sum: 1 }, nights: { $sum: "$items.nights" }, revenue: { $sum: "$amountPaid" } } },
      { $sort: { revenue: -1 } },
    ]),
    Booking.find({}).sort({ createdAt: -1 }).limit(8).lean<Doc[]>(),
    Booking.aggregate([
      { $match: { ...paidInRange, vertical: "stay" } },
      { $unwind: "$pricing.lines" },
      { $match: { "pricing.lines.type": "room" } },
      { $group: { _id: null, amount: { $sum: "$pricing.lines.amount" }, nights: { $sum: "$pricing.lines.quantity" } } },
    ]),
  ]);

  const names = new Map(
    (await Property.find({ _id: { $in: propertyAgg.map((p: Doc) => p._id) } }).select("name").lean<Doc[]>()).map((p) => [String(p._id), p.name as string]),
  );
  const visitors = visitorsAgg[0]?.n ?? 0;
  const bookings = kpiAgg[0]?.n ?? 0;
  const revenue = kpiAgg[0]?.revenue ?? 0;
  const monthly = monthlyAgg.map((m: Doc) => ({ month: m._id, revenue: m.revenue, bookings: m.bookings }));
  const last = monthly.at(-1)?.revenue ?? 0;
  const prev = monthly.at(-2)?.revenue ?? 0;

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    kpis: {
      visitors,
      checkoutReached: checkoutAgg[0]?.n ?? 0,
      bookings,
      conversionRate: visitors ? bookings / visitors : 0,
      revenue,
      avgBookingValue: bookings ? Math.round(revenue / bookings) : 0,
      avgNightlyRate: adrAgg[0]?.nights ? Math.round(adrAgg[0].amount / adrAgg[0].nights) : 0,
      repeatGuests: repeat,
      monthlyGrowth: prev ? (last - prev) / prev : null,
      pendingPayments: pending,
    },
    monthly,
    byVertical: ["stay", "stay_food", "darshan"].map((v) => {
      const r = verticalAgg.find((x: Doc) => x._id === v);
      return { vertical: v === "stay" ? "Stay" : v === "stay_food" ? "Stay + Food" : "Darshan", bookings: r?.bookings ?? 0, revenue: r?.revenue ?? 0 };
    }),
    byNights: ["1 night", "2 nights", "3–4 nights", "5–6 nights", "7+ nights"].map((b) => ({ bucket: b, bookings: nightsAgg.find((x: Doc) => x._id === b)?.bookings ?? 0 })),
    byGuests: ["1–2", "3–4", "5–6", "7+"].map((b) => ({ bucket: b, bookings: guestsAgg.find((x: Doc) => x._id === b)?.bookings ?? 0 })),
    properties: propertyAgg.map((p: Doc) => ({ name: names.get(String(p._id)) ?? "Unknown", bookings: p.bookings, nights: p.nights, revenue: p.revenue })),
    funnel: [
      { stage: "Visitors", value: visitors },
      { stage: "Checkout", value: checkoutAgg[0]?.n ?? 0 },
      { stage: "Bookings", value: bookings },
    ],
    recent: recent.map((b) => ({ _id: String(b._id), code: b.code, guest: b.guest?.name, item: b.items?.[0]?.title ?? "", total: b.pricing?.total ?? 0, status: b.status, createdAt: new Date(b.createdAt).toISOString() })),
  };
}
