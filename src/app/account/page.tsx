import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronRight, MapPin, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDate, inr, utcISO } from "@/lib/utils";
import Photo from "@/components/site/Photo";
import ResendVerification from "@/components/ResendVerification";
import { ChangePasswordForm } from "@/components/PasswordForms";

export const metadata: Metadata = { title: "My trips", robots: { index: false } };
export const dynamic = "force-dynamic";

const badge: Record<string, string> = { CONFIRMED: "bg-emerald-50 text-emerald-800", PENDING: "bg-amber-50 text-amber-800", CANCELLED: "bg-red-50 text-red-800", COMPLETED: "bg-slate-100 text-slate-700" };

export default async function Account() {
  const user = await requireUser("/account");
  const bookings = await db.booking.findMany({ where: { userId: user.id, NOT: [{ status: "PENDING", paymentStatus: { in: ["UNPAID", "FAILED"] } }, { status: "CANCELLED", paymentStatus: { in: ["UNPAID", "FAILED"] } }] }, include: { stay: true }, orderBy: { createdAt: "desc" } });
  const upcoming = bookings.filter((b: any) => b.status === "CONFIRMED" && utcISO(b.checkIn) >= new Date().toISOString().slice(0, 10)).length;
  const completed = bookings.filter((b: any) => b.status === "COMPLETED").length;

  return (
    <main className="home-shell py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div><span className="home-eyebrow"><UserRound size={13} /> ACCOUNT</span><h1 className="mt-2 text-3xl sm:text-4xl">My trips</h1><p className="mt-1 text-sm text-stone">Welcome back, {user.name.split(" ")[0]}.</p></div>
        <Link href="/stays" className="btn btn-primary">Find a stay</Link>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-xl"><div className="rounded-xl bg-mist p-4"><b className="text-xl">{bookings.length}</b><span className="mt-1 block text-xs text-stone">Total trips</span></div><div className="rounded-xl bg-mist p-4"><b className="text-xl">{upcoming}</b><span className="mt-1 block text-xs text-stone">Upcoming</span></div><div className="rounded-xl bg-mist p-4"><b className="text-xl">{completed}</b><span className="mt-1 block text-xs text-stone">Completed</span></div></div>

      {!user.emailVerifiedAt && <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Please confirm your email so we can send booking details. <ResendVerification /></p>}

      {bookings.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center"><CalendarDays className="mx-auto text-stone" /><p className="mt-3 text-lg">No trips yet.</p><Link href="/stays" className="btn btn-primary mt-5">Explore Vrindavan homes</Link></div> : <div className="mt-7 grid gap-3">{bookings.map((b: any) => <Link key={b.id} href={`/booking/${b.id}`} className="group grid grid-cols-[100px_1fr_auto] gap-4 rounded-2xl border border-line bg-white p-3 transition hover:border-pine hover:shadow-sm sm:grid-cols-[150px_1fr_auto]"><Photo src={b.stay.images[0]} alt={b.stay.title} className="h-28 w-full rounded-xl object-cover" /><div className="min-w-0 py-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-semibold">{b.stay.title}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${badge[b.status]}`}>{b.status}</span></div><p className="mt-1 flex items-center gap-1.5 text-sm text-stone"><MapPin size={13} />{b.stay.city}</p><p className="mt-2 text-sm">{formatDate(utcISO(b.checkIn))} – {formatDate(utcISO(b.checkOut))} · {b.guests} guests</p><p className="mt-1 text-sm font-semibold">{inr(b.total)} <span className="font-normal text-stone">· {b.code}</span></p></div><ChevronRight className="my-auto text-stone transition group-hover:translate-x-1" size={18} /></Link>)}</div>}

      <details className="mt-10 rounded-2xl border border-line bg-white p-5"><summary className="cursor-pointer font-semibold">Account settings</summary><div className="mt-5 max-w-lg"><ChangePasswordForm /></div></details>
    </main>
  );
}
