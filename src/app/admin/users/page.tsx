import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { setUserRole } from "../more-actions";
import { formatDate, utcISO } from "@/lib/utils";

export const metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function Users() {
  const me = await requireAdmin();
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { _count: { select: { bookings: true } } } });
  return (
    <div>
      <h1 className="text-3xl">Users</h1>
      <p className="mt-2 text-stone">{users.length} account{users.length === 1 ? "" : "s"}. Admins can open this panel, so only promote people you trust.</p>
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line text-stone"><tr><th className="p-4 font-medium">Name</th><th className="font-medium">Contact</th><th className="font-medium">Joined</th><th className="font-medium">Bookings</th><th className="font-medium">Email</th><th className="font-medium">Role</th></tr></thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-4 font-semibold">{u.name}</td>
                <td>{u.email}<br /><span className="text-xs text-stone">{u.phone}</span></td>
                <td>{formatDate(utcISO(u.createdAt))}</td>
                <td>{u._count.bookings}</td>
                <td>{u.emailVerifiedAt ? <span className="text-emerald-800">Verified</span> : <span className="text-stone">Not verified</span>}</td>
                <td>
                  {u.id === me.id ? <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold">You (admin)</span> : (
                    <form action={setUserRole} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="role" value={u.role === "ADMIN" ? "USER" : "ADMIN"} />
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${u.role === "ADMIN" ? "bg-marigold" : "bg-mist"}`}>{u.role === "ADMIN" ? "Admin" : "Guest"}</span>
                      <button className="text-xs underline underline-offset-4">{u.role === "ADMIN" ? "Make guest" : "Make admin"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
