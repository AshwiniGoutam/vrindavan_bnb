import { requireAdmin } from "@/server/auth/session";
import { connectDB } from "@/server/db/connect";
import { Notification } from "@/server/models";
import { PageHeader, Badge } from "@/components/admin/shell";
import { RetryNotificationButton } from "@/components/admin/retry-notification";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await requireAdmin("notifications.view");
  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await Notification.find({}).sort({ createdAt: -1 }).limit(200).lean<any[]>();
  return (
    <>
      <PageHeader eyebrow="Operations" title="Notifications" description="Every WhatsApp and email passes through this outbox and is retried automatically with backoff. Configure recipients and template names in Settings." />
      <div className="overflow-x-auto border hairline bg-paper">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="px-4 py-3 font-normal">When</th><th className="px-4 py-3 font-normal">Channel</th><th className="px-4 py-3 font-normal">To</th><th className="px-4 py-3 font-normal">Event</th><th className="px-4 py-3 font-normal">Status</th><th className="px-4 py-3 font-normal">Tries</th><th /></tr></thead>
          <tbody>
            {rows.map((n) => (
              <tr key={String(n._id)} className="border-t hairline align-top">
                <td className="px-4 py-3 text-xs">{new Date(n.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                <td className="px-4 py-3">{n.channel} · {n.audience}</td>
                <td className="px-4 py-3 font-mono text-xs">{n.to}</td>
                <td className="px-4 py-3">{n.event}<details className="text-xs text-muted"><summary className="cursor-pointer">preview</summary><pre className="whitespace-pre-wrap">{n.body}</pre></details>{n.lastError ? <p className="text-xs text-danger">{n.lastError}</p> : null}</td>
                <td className="px-4 py-3"><Badge value={n.status} /></td>
                <td className="px-4 py-3">{n.attempts}</td>
                <td className="px-4 py-3">{n.status !== "sent" ? <RetryNotificationButton id={String(n._id)} /> : null}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={7} className="px-4 py-12 text-center text-muted">No notifications yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
