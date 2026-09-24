import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import StayCard from "@/components/home/StayCard";
import SearchBar from "@/components/home/SearchBar";
import { inr, slugify } from "@/lib/utils";
import { site } from "@/lib/config";

type Props = { params: Promise<{ city: string }> };

async function load(slug: string) {
  const cities = await db.stay.findMany({ where: { published: true }, distinct: ["city"], select: { city: true, state: true } });
  const match = cities.find((c) => slugify(c.city) === slug);
  if (!match) return null;
  const stays = await db.stay.findMany({ where: { published: true, city: match.city }, orderBy: [{ featured: "desc" }, { rating: "desc" }] });
  return { city: match.city, state: match.state, stays, all: cities.map((c) => c.city) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await load((await params).city);
  if (!d) return {};
  const from = Math.min(...d.stays.map((s) => s.basePrice));
  return {
    title: `Villas and homestays in ${d.city}`,
    description: `${d.stays.length} private ${d.stays.length === 1 ? "home" : "homes"} in ${d.city}, ${d.state} from ${inr(from)} a night. Caretaker, home-cooked meals and secure online booking.`,
    alternates: { canonical: `${site.url}/destinations/${slugify(d.city)}` },
  };
}

export default async function Destination({ params }: Props) {
  const d = await load((await params).city);
  if (!d) notFound();
  const from = Math.min(...d.stays.map((s) => s.basePrice));
  const types = [...new Set(d.stays.map((s) => s.type.toLowerCase()))];
  const sleeps = Math.max(...d.stays.map((s) => s.maxGuests));

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <SearchBar cities={d.all} initial={{ city: d.city }} />
      <header className="mt-12 max-w-2xl">
        <h1 className="text-4xl md:text-5xl">Villas and homestays in {d.city}</h1>
        <p className="mt-4 text-lg text-stone">
          {d.stays.length} private {d.stays.length === 1 ? "home" : "homes"} in {d.city}, {d.state}: {types.join(", ")}. Prices start at {inr(from)} a night and the largest sleeps up to {sleeps} guests. Every stay has a caretaker, and meals can be cooked to order.
        </p>
      </header>
      <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {d.stays.map((s) => <StayCard key={s.id} stay={s} />)}
      </div>
      <p className="mt-12 text-stone">Looking somewhere else? <Link href="/stays" className="font-semibold text-pine underline underline-offset-4">Browse all stays</Link> or <Link href="/contact" className="font-semibold text-pine underline underline-offset-4">ask our team</Link>.</p>
    </div>
  );
}
