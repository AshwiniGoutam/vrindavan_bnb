import { notFound } from "next/navigation";
import Link from "next/link";
import StayForm from "@/components/admin/StayForm";
import { db } from "@/lib/db";
import { getCollections } from "@/lib/content";

export const metadata = { title: "Edit stay" };

export default async function EditStay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stay = await db.stay.findUnique({ where: { id } });
  if (!stay) notFound();
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Edit {stay.title}</h1>
        <div className="flex gap-4 text-sm"><Link href={`/admin/calendar/${stay.id}`} className="underline underline-offset-4">Calendar</Link><Link href={`/stays/${stay.slug}`} target="_blank" className="underline underline-offset-4">View live page</Link></div>
      </div>
      <StayForm stay={stay} collections={await getCollections()} />
    </div>
  );
}
