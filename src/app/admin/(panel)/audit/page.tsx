import { requireAdmin } from "@/server/auth/session";
import { connectDB } from "@/server/db/connect";
import { AuditLog } from "@/server/models";
import { PageHeader } from "@/components/admin/shell";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requireAdmin("audit.view");
  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await AuditLog.find({}).sort({ at: -1 }).limit(300).lean<any[]>();
  return (
    <>
      <PageHeader eyebrow="Admin" title="Audit log" description="Who changed what, and when. Price and status changes include before/after values." />
      <div className="overflow-x-auto border hairline bg-paper">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="px-4 py-3 font-normal">When</th><th className="px-4 py-3 font-normal">User</th><th className="px-4 py-3 font-normal">Action</th><th className="px-4 py-3 font-normal">Entity</th><th className="px-4 py-3 font-normal">Changes</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r._id)} className="border-t hairline align-top">
                <td className="px-4 py-3 text-xs">{new Date(r.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                <td className="px-4 py-3">{r.userName}</td>
                <td className="px-4 py-3">{r.action}</td>
                <td className="px-4 py-3">{r.entity}<div className="text-xs text-muted">{r.summary}</div></td>
                <td className="px-4 py-3">{r.after ? <details><summary className="cursor-pointer text-xs">diff</summary><pre className="max-w-md whitespace-pre-wrap text-[0.7rem]">{JSON.stringify({ before: r.before, after: r.after }, null, 2)}</pre></details> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
