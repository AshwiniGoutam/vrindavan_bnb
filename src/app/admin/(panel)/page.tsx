import Link from "next/link";
import { requireAdmin } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { getDashboard } from "@/server/services/analytics.service";
import { channelManager } from "@/lib/integrations/channel-manager";
import { PageHeader, Badge } from "@/components/admin/shell";
import { Kpis } from "@/components/admin/kpis";
import { DashboardCharts } from "@/components/admin/charts";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ forbidden?: string }> }) {
  const admin = await requireAdmin("dashboard.view");
  const { forbidden } = await searchParams;
  const showNumbers = can(admin.role, "analytics.view");
  const [data, cm] = await Promise.all([showNumbers ? getDashboard(30) : null, channelManager().healthCheck().catch((e: Error) => ({ ok: false, message: e.message }))]);

  return (
    <>
      <PageHeader eyebrow={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" })} title={`Radhe Radhe, ${admin.name.split(" ")[0]}.`} actions={<Link href="/admin/bookings" className="btn btn-primary !py-3">Bookings</Link>} />
      {forbidden ? <p className="mb-6 bg-linen p-4 text-sm text-danger">Your role doesn&apos;t have access to that page.</p> : null}
      <div className={`mb-6 flex items-center gap-3 border hairline p-4 text-sm ${cm.ok ? "bg-paper" : "bg-[#f0dfd9]"}`}>
        <Badge value={cm.ok ? "active" : "failed"} />
        <span>Channel manager ({channelManager().name}): {cm.message}</span>
      </div>
      {data ? (
        <div className="space-y-6">
          <p className="text-sm text-muted">Last 30 days · <Link href="/admin/analytics" className="underline">full analytics</Link></p>
          <Kpis data={data} />
          <DashboardCharts data={data} />
          <div className="border hairline bg-paper">
            <p className="field-label p-5">Recent bookings</p>
            <table className="w-full text-sm">
              <tbody>
                {data.recent.map((b) => (
                  <tr key={b._id} className="border-t hairline">
                    <td className="px-5 py-3 font-mono text-xs"><Link href={`/admin/bookings/${b._id}`} className="underline">{b.code}</Link></td>
                    <td className="px-5 py-3">{b.guest}</td>
                    <td className="hidden px-5 py-3 text-muted md:table-cell">{b.item}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatINR(b.total)}</td>
                    <td className="px-5 py-3"><Badge value={b.status} /></td>
                  </tr>
                ))}
                {!data.recent.length ? <tr><td className="px-5 py-6 text-muted">No bookings yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-muted">Use the menu to manage content.</p>
      )}
    </>
  );
}
