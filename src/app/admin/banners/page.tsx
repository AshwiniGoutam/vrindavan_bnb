import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteBanner, saveBanner } from "../more-actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import BannerForm from "@/components/admin/BannerForm";
export const metadata = { title: "Banners" }; export const dynamic = "force-dynamic";
export default async function BannersPage() { const banners = await db.siteContent.findMany({ where:{section:"banner"}, orderBy:[{sortOrder:"asc"},{createdAt:"desc"}] }); return <div className="grid gap-6"><div><h1 className="text-3xl">Banner management</h1><p className="mt-2 max-w-2xl text-stone">Manage the homepage slider independently. Add desktop/mobile artwork, copy, CTA and display order.</p></div><div className="grid gap-5">{banners.map((b:any)=><div key={b.id} className="rounded-2xl bg-white p-4 shadow-sm"><BannerForm action={saveBanner} banner={b}/><div className="mt-3 flex justify-end"><form action={deleteBanner}><input type="hidden" name="id" value={b.id}/><ConfirmButton message={`Delete "${b.title}"?`} className="rounded-lg px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"><Trash2 size={14}/> Delete</ConfirmButton></form></div></div>)}</div><div className="rounded-2xl border border-dashed border-line bg-white p-5"><h2 className="font-sans text-lg font-semibold">Add banner</h2><BannerForm action={saveBanner}/></div></div>; }
