import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, SlidersHorizontal } from "lucide-react";
import { db } from "@/lib/db";
import SearchBar from "@/components/home/SearchBar";
import StayCard from "@/components/home/StayCard";
import { getCollections, getDestinations } from "@/lib/content";
import { unavailableStayIds } from "@/lib/availability";
import { isISODate, nightsBetween } from "@/lib/utils";

export const metadata: Metadata = { title: "Vrindavan stays" };

type SP = { city?: string; collection?: string; guests?: string; checkIn?: string; checkOut?: string; sort?: string };

export default async function StaysPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const guests = Math.max(1, parseInt(sp.guests ?? "1", 10) || 1);
  const hasDates = isISODate(sp.checkIn) && isISODate(sp.checkOut) && nightsBetween(sp.checkIn, sp.checkOut) > 0;
  const where: Record<string, any> = { published: true, maxGuests: { gte: guests } };
  if (sp.city) where.OR = [{ city: { contains: sp.city, mode: "insensitive" } }, { title: { contains: sp.city, mode: "insensitive" } }, { state: { contains: sp.city, mode: "insensitive" } }];
  if (sp.collection) where.collections = { has: sp.collection };
  if (hasDates) where.id = { notIn: await unavailableStayIds(sp.checkIn!, sp.checkOut!) };
  const orderBy: Record<string, any> = sp.sort === "price-asc" ? { basePrice: "asc" } : sp.sort === "price-desc" ? { basePrice: "desc" } : sp.sort === "rating" ? { rating: "desc" } : { featured: "desc" };
  const [stays, cities, collectionList, destinations] = await Promise.all([db.stay.findMany({ where, orderBy }), db.stay.findMany({ where: { published: true }, distinct: ["city"], select: { city: true } }), getCollections(), getDestinations()]);
  const link = (patch: Partial<SP>) => { const p = new URLSearchParams(); for (const [k,v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k,String(v)); return `/stays?${p.toString()}`; };
  const active = collectionList.find((c:any)=>c.slug===sp.collection);

  return <main className="home-shell py-8 sm:py-10">
    <div className="rounded-2xl bg-mist p-5 sm:p-7"><span className="home-eyebrow"><MapPin size={13}/> VRINDAVAN, UTTAR PRADESH</span><h1 className="mt-2 text-3xl sm:text-4xl">Private homes in Vrindavan</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-stone">A small collection of six private stays. Choose the house first, then let the dates and guests shape the right fit.</p></div>
    <div className="mt-5"><SearchBar cities={[...new Set([...cities.map(c=>c.city), ...destinations])]} initial={{ city: sp.city, checkIn: hasDates ? sp.checkIn : undefined, checkOut: hasDates ? sp.checkOut : undefined, guests }}/></div>
    <div className="mt-8 flex flex-wrap items-end justify-between gap-4"><div><span className="home-eyebrow"><SlidersHorizontal size={13}/> {active?.title ?? "ALL HOMES"}</span><h2 className="mt-1 text-2xl">{stays.length} {stays.length===1?"home":"homes"} {hasDates?"available on your dates":"to explore"}</h2></div><div className="flex flex-wrap gap-1.5">{[["","Recommended"],["price-asc","Price low"],["price-desc","Price high"],["rating","Top rated"]].map(([v,l])=><Link key={v} href={link({sort:v})} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${(sp.sort??"")===v?"border-pine bg-pine text-white":"border-line bg-white"}`}>{l}</Link>)}</div></div>
    <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1"><Link href={link({collection:""})} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold ${!sp.collection?"border-pine bg-pine text-white":"border-line bg-white"}`}>Everything</Link>{collectionList.map((c:any)=><Link key={c.slug} href={link({collection:c.slug})} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold ${sp.collection===c.slug?"border-pine bg-pine text-white":"border-line bg-white"}`}>{c.title}</Link>)}</div>
    {stays.length===0?<div className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center"><p>No homes match these filters.</p><Link href="/contact" className="btn btn-primary mt-5">Ask our team</Link></div>:<div className="mt-7 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">{stays.map((s:any)=><StayCard key={s.id} stay={s}/>)}</div>}
  </main>;
}
