import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BedDouble, Bath, Users, Clock, MapPin, Home } from "lucide-react";
import { Gallery } from "@/components/site/gallery";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Icon } from "@/components/site/icon";
import { FaqList } from "@/components/site/faq-list";
import { JsonLd } from "@/components/site/json-ld";
import { PropertyCard, TYPE_LABEL } from "@/components/site/cards";
import { ViewTracker } from "@/components/site/view-tracker";
import { StayBookingWidget } from "@/components/booking/stay-booking-widget";
import { getPropertyBySlug } from "@/server/services/catalog.service";
import type { AmenityDTO } from "@/server/types";
import { getSettings } from "@/server/services/settings.service";
import { buildMetadata } from "@/lib/seo";
import { formatINR } from "@/lib/money";
import { appUrl, paragraphs } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPropertyBySlug(slug);
  if (!data) return { title: "Stay not found" };
  const p = data.property;
  return buildMetadata({ title: `${p.name} · ${TYPE_LABEL[p.type] ?? p.type} in Vrindavan`, description: p.shortDescription ?? p.tagline, path: `/stays/${p.slug}`, image: p.featuredImage, seo: p.seo });
}

export default async function StayPage({ params }: Props) {
  const { slug } = await params;
  const [data, settings] = await Promise.all([getPropertyBySlug(slug), getSettings()]);
  if (!data) notFound();
  const { property: p, mealPlans, addOns, policy, testimonials, similar } = data;
  // Cover first; the rest in admin order. The cover keeps its room tag from the gallery if it appears there.
  const gallery = p.gallery ?? [];
  const cover = p.featuredImage ? { ...p.featuredImage, group: p.featuredImage.group ?? gallery.find((g) => g.url === p.featuredImage?.url)?.group } : null;
  const images = [...(cover ? [cover] : []), ...gallery.filter((g) => g.url !== p.featuredImage?.url)];
  const amenityGroups: Record<string, AmenityDTO[]> = {};
  for (const a of p.amenities ?? []) {
    const g = a.group || "Essentials";
    if (!amenityGroups[g]) amenityGroups[g] = [];
    amenityGroups[g].push(a);
  }

  return (
    <>
      <ViewTracker id={p._id} name={p.name} vertical="stay" price={p.pricing.baseRate} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "VacationRental",
          name: p.name,
          description: p.shortDescription ?? p.tagline,
          url: `${appUrl()}/stays/${p.slug}`,
          image: images.slice(0, 5).map((i) => i.url),
          address: { "@type": "PostalAddress", addressLocality: p.location?.city ?? "Vrindavan", addressRegion: "Uttar Pradesh", addressCountry: "IN" },
          containsPlace: { "@type": "Accommodation", numberOfBedrooms: p.bedrooms, numberOfBathroomsTotal: p.bathrooms, occupancy: { "@type": "QuantitativeValue", maxValue: p.occupancy.maxGuests } },
          amenityFeature: (p.amenities ?? []).map((a) => ({ "@type": "LocationFeatureSpecification", name: a.name, value: true })),
          ...(p.pricing.baseRate ? { offers: { "@type": "Offer", priceCurrency: "INR", price: p.pricing.baseRate / 100, unitText: "night" } } : {}),
        }}
      />

      <div className="container-x pt-28 md:pt-32">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Stays", href: "/stays" }, { label: p.name }]} />
        <div className="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">{TYPE_LABEL[p.type]}{p.label ? ` · ${p.label}` : ""} · {p.location?.area ? `${p.location.area}, ` : ""}{p.location?.city ?? "Vrindavan"}</p>
            <h1 className="display mt-3 text-5xl text-ink md:text-7xl">{p.name}</h1>
            {p.tagline ? <p className="accent mt-3 text-2xl text-umber">{p.tagline}</p> : null}
          </div>
        </div>
        <div className="mt-10">
          <Gallery images={images} title={p.name} tour={p.photoTour} />
        </div>
      </div>

      <div className="container-x grid gap-16 py-16 lg:grid-cols-12 lg:py-24">
        <div className="space-y-16 lg:col-span-7">
          <div className="grid grid-cols-2 gap-px border hairline bg-charcoal/10 sm:grid-cols-4">
            {[
              { icon: Home, label: TYPE_LABEL[p.type] ?? p.type, sub: "Whole home" },
              { icon: BedDouble, label: `${p.bedrooms} bedroom${p.bedrooms === 1 ? "" : "s"}`, sub: "Private" },
              { icon: Bath, label: `${p.bathrooms} bathroom${p.bathrooms === 1 ? "" : "s"}`, sub: "Attached" },
              { icon: Users, label: `Up to ${p.occupancy.maxGuests}`, sub: "Guests" },
            ].map((s, i) => (
              <div key={i} className="bg-ivory p-5">
                <s.icon className="h-5 w-5 text-umber" strokeWidth={1.3} />
                <p className="mt-4 text-sm font-medium text-ink">{s.label}</p>
                <p className="text-xs text-muted">{s.sub}</p>
              </div>
            ))}
          </div>

          {p.status === "maintenance" ? <p className="bg-linen p-5 text-umber">{p.maintenanceNote || "This home is temporarily closed for upkeep. Message us for alternatives."}</p> : null}

          <section>
            <p className="eyebrow mb-5">About this home</p>
            <div className="prose-vhi max-w-none text-lg text-charcoal/90">
              {paragraphs(p.description ?? p.shortDescription).map((para, i) => <p key={i}>{para}</p>)}
            </div>
            {p.highlights?.length ? (
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {p.highlights.map((h) => (
                  <li key={h} className="border-l-2 border-brass/60 pl-4 text-charcoal">{h}</li>
                ))}
              </ul>
            ) : null}
          </section>

          {p.beds?.length ? (
            <section>
              <p className="eyebrow mb-5">Where you&apos;ll sleep</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {p.beds.map((b, i) => (
                  <div key={i} className="border hairline p-5">
                    <BedDouble className="h-6 w-6 text-umber" strokeWidth={1.2} />
                    <p className="mt-4 font-medium text-ink">{b.room}</p>
                    <p className="text-sm text-muted">{b.bedType}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {p.amenities?.length ? (
            <section>
              <p className="eyebrow mb-5">Amenities</p>
              <div className="space-y-8">
                {Object.entries(amenityGroups).map(([group, list]) => (
                  <div key={group}>
                    <p className="mb-3 text-sm font-medium text-ink">{group}</p>
                    <ul className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                      {list.map((a) => (
                        <li key={a._id} className="flex items-center gap-3 text-sm text-charcoal">
                          <Icon name={a.icon} className="h-4 w-4 text-umber" /> {a.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="grid gap-10 border-t hairline pt-12 sm:grid-cols-2">
            <div>
              <p className="eyebrow mb-4">Check-in & out</p>
              <p className="flex items-center gap-3 text-charcoal"><Clock className="h-4 w-4 text-umber" strokeWidth={1.3} /> Check-in from {p.checkInTime}</p>
              <p className="mt-2 flex items-center gap-3 text-charcoal"><Clock className="h-4 w-4 text-umber" strokeWidth={1.3} /> Check-out by {p.checkOutTime}</p>
            </div>
            {p.houseRules?.length ? (
              <div>
                <p className="eyebrow mb-4">House rules</p>
                <ul className="space-y-2 text-sm text-charcoal">
                  {p.houseRules.map((r) => <li key={r}>· {r}</li>)}
                </ul>
              </div>
            ) : null}
          </section>

          <section>
            <p className="eyebrow mb-5">Location</p>
            <p className="flex items-start gap-3 text-lg text-charcoal"><MapPin className="mt-1 h-5 w-5 text-umber" strokeWidth={1.3} /> {p.location?.area ? `${p.location.area}, ` : ""}{p.location?.city ?? "Vrindavan"}</p>
            <p className="mt-2 text-sm text-muted">The exact address is shared after booking.</p>
            {p.location?.nearby?.length ? (
              <ul className="mt-6 divide-y hairline border-y">
                {p.location.nearby.map((n) => (
                  <li key={n.name} className="flex justify-between py-3 text-sm"><span>{n.name}</span><span className="font-mono text-xs text-muted">{n.distance}</span></li>
                ))}
              </ul>
            ) : null}
            {p.location?.mapUrl ? <a href={p.location.mapUrl} target="_blank" rel="noopener noreferrer" className="link-line mt-5 inline-block text-sm font-medium">Open area map →</a> : null}
          </section>

          {testimonials.length ? (
            <section>
              <p className="eyebrow mb-5">Guest reviews</p>
              <div className="space-y-6">
                {testimonials.slice(0, 4).map((t) => (
                  <figure key={t._id} className="border-b hairline pb-6">
                    <p className="text-brass">{"★".repeat(t.rating)}</p>
                    <blockquote className="mt-3 text-lg leading-relaxed text-charcoal">“{t.text}”</blockquote>
                    <figcaption className="mt-3 text-sm text-muted">{t.guestName}{t.city ? ` · ${t.city}` : ""}{t.stayedIn ? ` · ${t.stayedIn}` : ""}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          {policy ? (
            <section className="bg-paper p-6 md:p-8">
              <p className="eyebrow mb-3">Cancellation</p>
              <p className="text-charcoal">{policy.summary}</p>
              {policy.rules?.length ? (
                <ul className="mt-4 space-y-1 text-sm text-muted">
                  {[...policy.rules].sort((a, b) => b.daysBeforeMin - a.daysBeforeMin).map((r, i) => (
                    <li key={i}>{r.daysBeforeMin > 0 ? `${r.daysBeforeMin}+ days before check-in` : "Less than that"}: {r.refundPercent}% refund</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {p.faqs?.length ? (
            <section>
              <p className="eyebrow mb-5">Questions</p>
              <FaqList items={p.faqs} />
            </section>
          ) : null}
        </div>

        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-28" id="book">
            <StayBookingWidget
              properties={[{ _id: p._id, slug: p.slug, name: p.name, status: p.status, occupancy: p.occupancy, stayRules: p.stayRules, baseRate: p.pricing.baseRate }]}
              mealPlans={mealPlans}
              addOns={addOns}
              whatsapp={settings.business.whatsapp}
              maxAdvanceDays={settings.booking.maxAdvanceDays}
              policySummary={policy?.summary}
            />
          </div>
        </aside>
      </div>

      {/* mobile booking bar */}
      <div className="no-print fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t hairline bg-ivory px-5 py-3 lg:hidden">
        <p className="text-sm">{p.pricing.baseRate ? <><b className="font-semibold">{formatINR(p.pricing.baseRate)}</b> <span className="text-muted">/ night</span></> : p.name}</p>
        <a href="#book" className="btn btn-primary !py-3">Check dates</a>
      </div>

      {similar.length ? (
        <section className="border-t hairline bg-paper py-20">
          <div className="container-x">
            <h2 className="display text-4xl text-ink md:text-5xl">You may also like</h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s) => <PropertyCard key={s._id} p={s} />)}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
