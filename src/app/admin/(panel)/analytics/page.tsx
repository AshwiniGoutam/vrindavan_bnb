import Link from "next/link";
import { requireAdmin } from "@/server/auth/session";
import { getDashboard } from "@/server/services/analytics.service";
import { PageHeader } from "@/components/admin/shell";
import { Kpis } from "@/components/admin/kpis";
import { DashboardCharts } from "@/components/admin/charts";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Analytics" };
const RANGES = [7, 30, 90, 365];

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin("analytics.view");
  const { days: d } = await searchParams;
  const days = RANGES.includes(Number(d)) ? Number(d) : 30;
  const data = await getDashboard(days);
  return (
    <>
      <PageHeader
        eyebrow="Performance"
        title="Analytics"
        description="Visitors & funnel come from first-party tracking; revenue from paid bookings (net of refunds). GA4 and Meta hold the full marketing picture."
        actions={
          <div className="flex border hairline">
            {RANGES.map((r) => (
              <Link key={r} href={`/admin/analytics?days=${r}`} className={cn("px-4 py-2 text-xs", r === days ? "bg-charcoal text-ivory" : "hover:bg-paper")}>
                {r === 365 ? "12 mo" : `${r} days`}
              </Link>
            ))}
          </div>
        }
      />
      <div className="space-y-6">
        <Kpis data={data} full />
        <DashboardCharts data={data} full />
        <div className="overflow-x-auto border hairline bg-paper">
          <p className="field-label p-5">Property-wise performance</p>
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr className="border-t hairline"><th className="px-5 py-3 font-normal">Property</th><th className="px-5 py-3 font-normal">Bookings</th><th className="px-5 py-3 font-normal">Nights</th><th className="px-5 py-3 text-right font-normal">Revenue</th><th className="px-5 py-3 text-right font-normal">Per night</th></tr>
            </thead>
            <tbody>
              {data.properties.map((p) => (
                <tr key={p.name} className="border-t hairline">
                  <td className="px-5 py-3">{p.name}</td>
                  <td className="px-5 py-3">{p.bookings}</td>
                  <td className="px-5 py-3">{p.nights}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatINR(p.revenue)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{p.nights ? formatINR(Math.round(p.revenue / p.nights)) : "—"}</td>
                </tr>
              ))}
              {!data.properties.length ? <tr><td className="px-5 py-6 text-muted">No stay bookings in this period.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
