import { NextResponse } from "next/server";
import { withAdmin } from "@/server/auth/with-admin";
import { connectDB } from "@/server/db/connect";
import { Booking } from "@/server/models";
import { paiseToRupees } from "@/lib/money";
import { audit } from "@/server/audit";

const csv = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // guard against spreadsheet formula injection
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const GET = withAdmin("bookings.view", async (req, { admin }) => {
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  if (sp.get("status")) filter.status = sp.get("status");
  if (sp.get("vertical")) filter.vertical = sp.get("vertical");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await Booking.find(filter).sort({ createdAt: -1 }).limit(5000).lean<any[]>();
  const header = ["Code", "Created", "Offering", "Item", "Check-in / Travel", "Check-out", "Nights", "Adults", "Children", "Meal plan", "Guest", "Phone", "Email", "Status", "Payment", "Subtotal", "Discount", "GST", "Total", "Paid", "Refunded", "Invoice", "UTM source", "UTM campaign"];
  const lines = rows.map((b) => {
    const i = b.items?.[0] ?? {};
    return [
      b.code, new Date(b.createdAt).toISOString(), b.vertical, i.title, i.checkIn ?? i.travelDate, i.checkOut, i.nights, i.adults, i.children, i.mealPlanName,
      b.guest?.name, b.guest?.phone, b.guest?.email, b.status, b.paymentStatus,
      paiseToRupees(b.pricing?.subtotal ?? 0), paiseToRupees(b.pricing?.discountTotal ?? 0), paiseToRupees(b.pricing?.gstTotal ?? 0), paiseToRupees(b.pricing?.total ?? 0),
      paiseToRupees(b.amountPaid ?? 0), paiseToRupees(b.amountRefunded ?? 0), b.invoiceNumber, b.attribution?.utm_source, b.attribution?.utm_campaign,
    ].map(csv).join(",");
  });
  await audit(admin, "export", "Booking", "-", { summary: `${rows.length} rows` });
  return new NextResponse([header.join(","), ...lines].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="vhi-bookings-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
});
