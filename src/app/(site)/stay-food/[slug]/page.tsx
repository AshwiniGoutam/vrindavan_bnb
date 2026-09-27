import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, X, FileDown } from "lucide-react";
import { Photo } from "@/components/site/photo";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { FaqList } from "@/components/site/faq-list";
import { PackageCard, PropertyCard } from "@/components/site/cards";
import { ViewTracker } from "@/components/site/view-tracker";
import { StayBookingWidget } from "@/components/booking/stay-booking-widget";
import { getPackageBySlug } from "@/server/services/catalog.service";
import { getSettings } from "@/server/services/settings.service";
import { buildMetadata } from "@/lib/seo";
import { paragraphs } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPackageBySlug(slug);
  if (!data) return { title: "Package not found" };
  return buildMetadata({ title: data.pkg.title, description: data.pkg.tagline ?? data.pkg.description?.slice(0, 155), path: `/stay-food/${slug}`, image: data.pkg.heroImage, seo: data.pkg.seo });
}

export default async function PackagePage({ params }: Props) {
  const { slug } = await params;
  const [data, settings] = await Promise.all([getPackageBySlug(slug), getSettings()]);
  if (!data) notFound();
  const { pkg, properties, mealPlans, itinerary, addOns, policy, others } = data;

  return (
    <>
      <ViewTracker id={pkg._id} name={pkg.title} vertical="stay_food" price={pkg.price} />
      <section className="pt-28 md:pt-32">
        <div className="container-x">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Stay + Food", href: "/stay-food" }, { label: pkg.title }]} />
          <div className="mt-8 grid items-end gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="eyebrow">{pkg.nights} nights · Stay + Sattvik Food</p>
              <h1 className="display mt-4 text-5xl text-ink md:text-7xl">{pkg.title}</h1>
              {pkg.tagline ? <p className="accent mt-4 text-2xl text-umber">{pkg.tagline}</p> : null}
            </div>
            {pkg.offerText ? <p className="border border-charcoal px-5 py-4 text-sm lg:col-span-4 lg:col-start-9">{pkg.offerText}</p> : null}
          </div>
          <Photo media={pkg.heroImage} alt={pkg.title} className="mt-10 aspect-[16/9] md:aspect-[21/9]" priority label={`${pkg.nights} nights`} />
        </div>
      </section>

      <div className="container-x grid gap-16 py-16 lg:grid-cols-12 lg:py-24">
        <div className="space-y-20 lg:col-span-7">
          <section className="prose-vhi text-lg text-charcoal/90">{paragraphs(pkg.description).map((p, i) => <p key={i}>{p}</p>)}</section>

          <section className="grid gap-12 md:grid-cols-2">
            <div>
              <p className="eyebrow mb-6">Included</p>
              <ul className="space-y-3">{(pkg.inclusions ?? []).map((x) => <li key={x} className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-success" strokeWidth={1.6} />{x}</li>)}</ul>
            </div>
            <div>
              <p className="eyebrow mb-6">Not included</p>
              <ul className="space-y-3 text-muted">{(pkg.exclusions ?? []).map((x) => <li key={x} className="flex gap-3"><X className="mt-1 h-4 w-4 shrink-0" strokeWidth={1.6} />{x}</li>)}</ul>
            </div>
          </section>

          {itinerary?.days?.length ? (
            <section>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="eyebrow mb-4">Suggested itinerary</p>
                  <h2 className="display text-4xl text-ink">{itinerary.title}</h2>
                </div>
                {itinerary.pdf?.url ? (
                  <a href={itinerary.pdf.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline !py-3"><FileDown className="h-4 w-4" /> PDF</a>
                ) : null}
              </div>
              {itinerary.summary ? <p className="mt-4 text-muted">{itinerary.summary}</p> : null}
              <ol className="mt-10">
                {itinerary.days.map((d) => (
                  <li key={d.day} className="grid grid-cols-[4rem_1fr] gap-6 border-t hairline py-8">
                    <p className="display text-5xl text-ink">{String(d.day).padStart(2, "0")}</p>
                    <div>
                      <h3 className="display text-2xl text-ink">{d.title}</h3>
                      {d.summary ? <p className="mt-2 text-muted">{d.summary}</p> : null}
                      {d.items?.length ? <ul className="mt-4 space-y-2 text-sm text-charcoal">{d.items.map((it, j) => <li key={j}>· {it}</li>)}</ul> : null}
                    </div>
                  </li>
                ))}
              </ol>
              {itinerary.printedCopyIncluded ? <p className="text-sm text-muted">A printed copy waits for you at check-in.</p> : null}
            </section>
          ) : null}

          {pkg.localRecommendations?.length ? (
            <section>
              <p className="eyebrow mb-6">Eat like a local</p>
              <div className="grid gap-6 sm:grid-cols-2">
                {pkg.localRecommendations.map((r) => (
                  <div key={r.title} className="border hairline p-6">
                    <h3 className="display text-2xl text-ink">{r.title}</h3>
                    <p className="mt-2 text-sm text-muted">{r.description}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {properties.length ? (
            <section>
              <p className="eyebrow mb-6">Choose your home</p>
              <div className="grid gap-8 sm:grid-cols-2">{properties.slice(0, 4).map((p) => <PropertyCard key={p._id} p={p} />)}</div>
            </section>
          ) : null}

          {pkg.faqs?.length ? <FaqList items={pkg.faqs} /> : null}
        </div>

        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-28" id="book">
            {properties.length && mealPlans.length ? (
              <StayBookingWidget
                pkg={{ slug: pkg.slug, title: pkg.title, nights: pkg.nights }}
                properties={properties.map((p) => ({ _id: p._id, slug: p.slug, name: p.name, status: p.status, occupancy: p.occupancy, stayRules: p.stayRules, baseRate: p.pricing.baseRate }))}
                mealPlans={mealPlans}
                addOns={addOns}
                whatsapp={settings.business.whatsapp}
                maxAdvanceDays={settings.booking.maxAdvanceDays}
                policySummary={policy?.summary}
              />
            ) : (
              <p className="bg-paper p-8 text-muted">This package opens for booking soon. Message us on WhatsApp to reserve.</p>
            )}
          </div>
        </aside>
      </div>

      {others.length ? (
        <section className="border-t hairline bg-paper py-20">
          <div className="container-x">
            <h2 className="display text-4xl text-ink">Other packages</h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">{others.map((o) => <PackageCard key={o._id} p={o} />)}</div>
          </div>
        </section>
      ) : null}
    </>
  );
}
