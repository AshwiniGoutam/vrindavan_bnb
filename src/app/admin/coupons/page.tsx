import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { createCoupon, deleteCoupon, toggleCoupon } from "../more-actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { formatDate, inr, utcISO } from "@/lib/utils";

export const metadata = { title: "Coupons" };
export const dynamic = "force-dynamic";

export default async function Coupons({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [coupons, stays] = await Promise.all([db.coupon.findMany({ orderBy: { createdAt: "desc" } }), db.stay.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } })]);
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl">Coupons and offers</h1>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <form action={createCoupon} className="grid gap-4 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-sans text-lg font-semibold">New code</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <div><label className="label" htmlFor="cc">Code</label><input id="cc" name="code" placeholder="WELCOME10" className="field uppercase" required /></div>
          <div><label className="label" htmlFor="ct">Type</label><select id="ct" name="type" className="field"><option value="PERCENT">Percent off</option><option value="FLAT">Flat ₹ off</option></select></div>
          <div><label className="label" htmlFor="cv">Value</label><input id="cv" name="value" type="number" min={1} className="field" required /></div>
          <div><label className="label" htmlFor="cm">Max discount (₹)</label><input id="cm" name="maxDiscount" type="number" min={1} className="field" placeholder="No cap" /></div>
          <div><label className="label" htmlFor="cn">Minimum nights</label><input id="cn" name="minNights" type="number" min={1} defaultValue={1} className="field" /></div>
          <div><label className="label" htmlFor="ca">Minimum stay total (₹)</label><input id="ca" name="minAmount" type="number" min={0} defaultValue={0} className="field" /></div>
          <div><label className="label" htmlFor="cu">Usage limit</label><input id="cu" name="usageLimit" type="number" min={1} className="field" placeholder="Unlimited" /></div>
          <div><label className="label" htmlFor="cd">Valid until</label><input id="cd" name="validTo" type="date" className="field" /></div>
        </div>
        <div><label className="label" htmlFor="cx">Description (internal)</label><input id="cx" name="description" className="field" /></div>
        <fieldset>
          <legend className="label">Only for these stays (leave all unticked for every stay)</legend>
          <div className="grid gap-2 sm:grid-cols-3">{stays.map((s) => <label key={s.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="stayIds" value={s.id} /> {s.title}</label>)}</div>
        </fieldset>
        <button className="btn btn-primary self-start">Create code</button>
        <p className="text-xs text-stone">Discounts apply to the room charge before GST. A code counts as used only once a booking is paid.</p>
      </form>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line text-stone"><tr><th className="p-4 font-medium">Code</th><th className="font-medium">Offer</th><th className="font-medium">Rules</th><th className="font-medium">Used</th><th className="font-medium">Expires</th><th className="font-medium">Status</th><th /></tr></thead>
          <tbody className="divide-y divide-line">
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="p-4 font-mono font-semibold">{c.code}</td>
                <td>{c.type === "PERCENT" ? `${c.value}% off` : `${inr(c.value)} off`}{c.maxDiscount ? ` (max ${inr(c.maxDiscount)})` : ""}</td>
                <td className="text-stone">{c.minNights > 1 ? `${c.minNights}+ nights` : "Any stay"}{c.minAmount ? `, over ${inr(c.minAmount)}` : ""}{c.stayIds.length ? `, ${c.stayIds.length} stay(s)` : ""}</td>
                <td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                <td>{c.validTo ? formatDate(utcISO(c.validTo)) : "Never"}</td>
                <td><form action={toggleCoupon}><input type="hidden" name="id" value={c.id} /><button className={`rounded-full px-3 py-1 text-xs font-semibold ${c.active ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"}`}>{c.active ? "Active" : "Paused"}</button></form></td>
                <td className="pr-4 text-right"><form action={deleteCoupon}><input type="hidden" name="id" value={c.id} /><ConfirmButton message={`Delete ${c.code}?`} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><Trash2 size={15} /></ConfirmButton></form></td>
              </tr>
            ))}
            {coupons.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-stone">No codes yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
