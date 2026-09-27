import type { DashboardData } from "@/server/services/analytics.service";
import { formatINR } from "@/lib/money";

export function Kpis({ data, full }: { data: DashboardData; full?: boolean }) {
  const k = data.kpis;
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const items: [string, string, string?][] = [
    ["Total revenue", formatINR(k.revenue)],
    ["Bookings", String(k.bookings)],
    ["Visitors", k.visitors.toLocaleString("en-IN")],
    ["Conversion", pct(k.conversionRate), "bookings ÷ visitors"],
    ["Avg booking value", formatINR(k.avgBookingValue)],
    ["Avg nightly rate", formatINR(k.avgNightlyRate), "stays only"],
    ["Monthly growth", k.monthlyGrowth == null ? "—" : `${k.monthlyGrowth >= 0 ? "+" : ""}${pct(k.monthlyGrowth)}`, "revenue, this vs last month"],
    ["Repeat guests", String(k.repeatGuests)],
    ...(full
      ? ([
          ["Checkout reached", String(k.checkoutReached)],
          ["Pending payments", String(k.pendingPayments), "right now"],
          ...data.byVertical.map((v) => [`${v.vertical} bookings`, String(v.bookings), formatINR(v.revenue)] as [string, string, string]),
        ] as [string, string, string?][])
      : []),
  ];
  return (
    <div className="grid grid-cols-2 gap-px border hairline bg-charcoal/10 md:grid-cols-4">
      {items.map(([label, value, hint]) => (
        <div key={label} className="bg-paper p-5">
          <p className="field-label">{label}</p>
          <p className="display mt-3 text-3xl text-ink">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
        </div>
      ))}
    </div>
  );
}
