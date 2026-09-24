import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BedDouble, Bath, Clock3, MapPin, Star, Users, Wifi, Utensils, ShieldCheck } from "lucide-react";
import { formatDate, inr, utcISO } from "@/lib/utils";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getUnavailableRanges } from "@/lib/availability";
import { amenityByKey } from "@/lib/amenities";
import { cancellationPolicy, site } from "@/lib/config";
import Gallery from "@/components/stay/Gallery";
import BookingWidget from "@/components/stay/BookingWidget";
import StayCard from "@/components/home/StayCard";
import Link from "next/link";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ checkIn?: string; checkOut?: string; guests?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await db.stay.findFirst({ where: { slug, published: true } });
  if (!s) return {};
  return { title: `${s.title}, ${s.city}`, description: s.tagline ?? s.description.slice(0, 155), openGraph: { images: s.images[0] ? [s.images[0]] : [] } };
}

export default async function StayPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const stay = await db.stay.findFirst({ where: { slug, published: true } });
  if (!stay) notFound();

  const [user, unavailable, reviews, nearby] = await Promise.all([
    getCurrentUser(),
    getUnavailableRanges(stay.id),
    db.review.findMany({ where: { stayId: stay.id, published: true }, orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }),
    db.stay.findMany({ where: { published: true, city: stay.city, id: { not: stay.id } }, orderBy: { featured: "desc" }, take: 4 }),
  ]);

  const free = cancellationPolicy.filter((t) => t.refundPercent === 100).sort((a, b) => b.daysBefore - a.daysBefore).at(-1);
  const cancelNote = free ? `Free cancellation up to ${free.daysBefore} days before check-in.` : undefined;
  const jsonLd = { "@context": "https://schema.org", "@type": "LodgingBusiness", name: stay.title, image: stay.images, address: { "@type": "PostalAddress", addressLocality: stay.city, addressRegion: stay.state, addressCountry: "IN" }, priceRange: `₹${stay.basePrice}+`, aggregateRating: stay.reviewCount > 0 ? { "@type": "AggregateRating", ratingValue: stay.rating, reviewCount: stay.reviewCount } : undefined, url: `${site.url}/stays/${stay.slug}` };

  return (
    <main className="stay-page home-shell py-5 sm:py-7">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-stone"><Link href="/stays" className="hover:text-pine">Stays</Link><span>/</span><span>{stay.city}</span><span>/</span><span className="text-pine">{stay.title}</span></div>
      <Gallery images={stay.images} title={stay.title} />

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_350px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
            <div><p className="flex items-center gap-1.5 text-sm text-stone"><MapPin size={15}/>{stay.city}, {stay.state}</p><h1 className="mt-1 text-3xl sm:text-4xl">{stay.title}</h1>{stay.tagline && <p className="mt-2 text-base text-stone">{stay.tagline}</p>}</div>
            <div className="rounded-xl bg-mist px-3 py-2 text-right"><div className="flex items-center gap-1 text-sm font-semibold"><Star size={14} className="fill-marigold text-marigold"/>{stay.rating.toFixed(1)}</div><small className="text-stone">{stay.reviewCount} reviews</small></div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-line py-4 sm:grid-cols-4">
            <div className="stay-stat"><Users size={16}/><span>Up to {stay.maxGuests}</span></div><div className="stay-stat"><BedDouble size={16}/><span>{stay.bedrooms} bedrooms</span></div><div className="stay-stat"><Bath size={16}/><span>{stay.bathrooms} bathrooms</span></div><div className="stay-stat"><Clock3 size={16}/><span>{stay.checkInTime} / {stay.checkOutTime}</span></div>
          </div>

          <section className="stay-section"><span className="home-eyebrow">ABOUT THE HOME</span><h2>{stay.title} is made for slow days.</h2><p className="whitespace-pre-line">{stay.description}</p></section>

          <section className="stay-section"><span className="home-eyebrow">WHAT'S INCLUDED</span><div className="amenity-compact">{stay.amenities.map((k) => { const a=amenityByKey[k]; if(!a) return null; return <div key={k}><a.Icon size={16}/><span>{a.label}</span></div>; })}</div></section>

          <section className="stay-section"><span className="home-eyebrow">THE VHI EXPERIENCE</span><div className="experience-mini-grid"><div><ShieldCheck size={18}/><b>Private home</b><span>The whole property is yours.</span></div><div><Utensils size={18}/><b>Local food</b><span>Meals can be arranged around your stay.</span></div><div><Wifi size={18}/><b>Stay connected</b><span>Wi-Fi and work-friendly corners.</span></div></div></section>

          <section className="stay-section"><span className="home-eyebrow">GOOD TO KNOW</span><div className="good-know-grid"><div><b>Check-in</b><span>From {stay.checkInTime}</span></div><div><b>Check-out</b><span>By {stay.checkOutTime}</span></div><div><b>Minimum stay</b><span>{stay.minNights} night{stay.minNights > 1 ? "s" : ""}</span></div><div><b>Cancellation</b><span>{cancelNote ?? "See policy"}</span></div></div>{stay.rules && <p className="mt-4 whitespace-pre-line text-sm text-stone">{stay.rules}</p>}</section>

          {reviews.length > 0 && <section className="stay-section"><div className="flex items-end justify-between gap-3"><div><span className="home-eyebrow">GUEST REVIEWS</span><h2>{stay.rating.toFixed(1)} · {stay.reviewCount} reviews</h2></div><span className="text-sm">★★★★★</span></div><div className="review-mini-grid mt-5">{reviews.map((r:any)=><article key={r.id}><div className="flex items-center justify-between"><b>{r.user?.name?.split(" ")[0] ?? "Guest"}</b><span>★★★★★</span></div><p>{r.comment}</p><small>{formatDate(utcISO(r.createdAt))}</small></article>)}</div></section>}

          {nearby.length > 0 && <section className="stay-section"><div className="flex items-end justify-between"><div><span className="home-eyebrow">MORE IN {stay.city.toUpperCase()}</span><h2>Other Vrindavan Holiday Inn homes</h2></div><Link href="/stays" className="home-link">See all <span>→</span></Link></div><div className="stay-grid compact-stay-grid mt-5">{nearby.map((s:any)=><StayCard key={s.id} stay={s}/>)}</div></section>}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start"><BookingWidget stay={{ id: stay.id, slug: stay.slug, title: stay.title, basePrice: stay.basePrice, maxGuests: stay.maxGuests, minNights: stay.minNights }} unavailable={unavailable} cancelNote={cancelNote} user={user ? { name: user.name, email: user.email, phone: user.phone } : null} initial={{ checkIn: sp.checkIn, checkOut: sp.checkOut, guests: sp.guests ? parseInt(sp.guests, 10) : undefined }} /></aside>
      </div>
    </main>
  );
}
