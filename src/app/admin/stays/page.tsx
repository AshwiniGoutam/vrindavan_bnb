import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteStay } from "../actions";
import Photo from "@/components/site/Photo";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { inr } from "@/lib/utils";

export const metadata = { title: "Stays" };
export const dynamic = "force-dynamic";

export default async function AdminStays() {
  const stays = await db.stay.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { bookings: true } } } });
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl">Stays</h1>
        <Link href="/admin/stays/new" className="btn btn-primary"><Plus size={18} /> Add stay</Link>
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-stone"><tr><th className="p-4 font-medium">Stay</th><th className="font-medium">Location</th><th className="font-medium">Price</th><th className="font-medium">Bookings</th><th className="font-medium">Status</th><th /></tr></thead>
          <tbody className="divide-y divide-line">
            {stays.map((s) => (
              <tr key={s.id}>
                <td className="p-4"><div className="flex items-center gap-3"><Photo src={s.images[0]} alt="" className="size-12 rounded-lg" /><div><p className="font-semibold">{s.title}</p><p className="text-xs text-stone">{s.type}{s.featured ? " · Featured" : ""}</p></div></div></td>
                <td>{s.city}, {s.state}</td>
                <td>{inr(s.basePrice)}</td>
                <td>{s._count.bookings}</td>
                <td><span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.published ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"}`}>{s.published ? "Published" : "Hidden"}</span></td>
                <td className="pr-4">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/stays/${s.id}`} className="btn btn-ghost !px-3 !py-2" aria-label={`Edit ${s.title}`}><Pencil size={15} /></Link>
                    <form action={deleteStay}>
                      <input type="hidden" name="id" value={s.id} />
                      <ConfirmButton message={s._count.bookings ? "This stay has bookings, so it will be hidden instead of deleted. Continue?" : "Delete this stay permanently?"} className="btn btn-ghost !px-3 !py-2 !border-red-300 !text-red-700 hover:!bg-red-600 hover:!text-white"><Trash2 size={15} /></ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {stays.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-stone">No stays yet. Add your first one.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
