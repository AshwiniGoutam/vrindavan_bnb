import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, X, MapPin, Car, Utensils, Home as HomeIcon, Info, FileDown, MessageCircle } from "lucide-react";
import { Photo } from "@/components/site/photo";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { FaqList } from "@/components/site/faq-list";
import { JsonLd } from "@/components/site/json-ld";
import { TourCard } from "@/components/site/cards";
import { Reveal } from "@/components/site/reveal";
import { ViewTracker } from "@/components/site/view-tracker";
import { TourBookingCard } from "@/components/booking/tour-booking-card";
import { getTourBySlug } from "@/server/services/catalog.service";
import { getSettings } from "@/server/services/settings.service";
import { buildMetadata } from "@/lib/seo";
import { formatINR } from "@/lib/money";
import { appUrl, paragraphs, whatsappLink } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getTourBySlug(slug);
  if (!data) return { title: "Journey not found" };
  const t = data.tour;
  return buildMetadata({ title: `${t.title} · ${t.durationLabel ?? "Darshan Tour"}`, description: t.subtitle ?? t.overview?.slice(0, 155), path: `/darshan-tours/${t.slug}`, image: t.heroImage, seo: t.seo });
}

const NAV = [
  ["overview", "Overview"],
  ["itinerary", "Itinerary"],
  ["stay", "Stay & meals"],
  ["included", "Inclusions"],
  ["travel", "Pickup & vehicle"],
  ["info", "Good to know"],
  ["faq", "FAQ"],
];

export default async function TourPage({ params }: Props) {
  const { slug } = await params;
  const [data, settings] = await Promise.all([getTourBySlug(slug), getSettings()]);
  if (!data) notFound();
  const { tour: t, related, addOns, policy, testimonials } = data;
  const minGroup = t.minGroupSize ?? settings.booking.defaultMinGroupSize;
  const advanceDays = t.advanceDays ?? settings.booking.defaultAdvanceDays;
  const wa = settings.business.whatsapp;

  return (
    <>
      <ViewTracker id={t._id} name={t.title} vertical="darshan" price={t.pricing.adultPrice} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TouristTrip",
          name: t.title,
          description: t.subtitle ?? t.overview,
          url: `${appUrl()}/darshan-tours/${t.slug}`,
          image: t.heroImage?.url,
          itinerary: { "@type": "ItemList", itemListElement: (t.itinerary ?? []).map((d, i) => ({ "@type": "ListItem", position: i + 1, name: `Day ${d.day}: ${d.title}` })) },
          ...(t.pricing.adultPrice ? { offers: { "@type": "Offer", priceCurrency: "INR", price: t.pricing.adultPrice / 100, availability: "https://schema.org/InStock" } } : {}),
        }}
      />

      {/* Hero */}
      <section className="relative flex min-h-[88svh] items-end overflow-hidden bg-ink text-ivory">
        <Photo media={t.heroImage} alt={t.heroImage?.alt || t.title} className="!absolute inset-0 h-full w-full bg-ink" imgClassName="opacity-70" priority label="Darshan" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-ink/40" />
        <div className="container-x relative pb-14 pt-36 md:pb-20">
          <Breadcrumbs light items={[{ label: "Home", href: "/" }, { label: "Darshan Tours", href: "/darshan-tours" }, { label: t.title }]} />
          <p className="eyebrow mt-10 text-sand">{t.eyebrow ?? "Darshan journey"} · {t.durationLabel}</p>
          <h1 className="display mt-5 max-w-5xl text-5xl md:text-8xl">{t.title}</h1>
          {t.subtitle ? <p className="mt-6 max-w-2xl text-lg text-sand">{t.subtitle}</p> : null}
          <div className="mt-10 grid max-w-3xl grid-cols-2 gap-px bg-white/15 md:grid-cols-4">
            {[
              ["Duration", t.durationLabel ?? `${t.nights}N / ${t.days}D`],
              ["Per person", t.pricing.adultPrice ? formatINR(t.pricing.adultPrice) : "On request"],
              ["Group", `Min. ${minGroup} guests`],
              ["Book", `${advanceDays}+ days ahead`],
            ].map(([k, v]) => (
              <div key={k} className="bg-ink/60 p-4 backdrop-blur-sm">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-sand">{k}</p>
                <p className="mt-2 text-base text-ivory">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section nav */}
      <nav className="sticky top-20 z-30 border-b hairline bg-ivory/95 backdrop-blur" aria-label="Tour sections">
        <div className="container-x no-scrollbar flex gap-8 overflow-x-auto py-4 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted">
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="shrink-0 hover:text-ink">{label}</a>
          ))}
          <a href="#book" className="ml-auto shrink-0 text-ink underline underline-offset-4">Book</a>
        </div>
      </nav>

      <div className="container-x grid gap-16 py-16 lg:grid-cols-12 lg:py-24">
        <div className="space-y-24 lg:col-span-7">
          {/* Overview */}
          <section id="overview" className="scroll-mt-40">
            <p className="eyebrow mb-5">Overview</p>
            <div className="prose-vhi text-lg text-charcoal/90">
              {paragraphs(t.overview).map((p, i) => <p key={i}>{p}</p>)}
            </div>
            {t.highlights?.length ? (
              <ul className="mt-10 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {t.highlights.map((h) => (
                  <li key={h} className="flex gap-3 text-charcoal"><Check className="mt-1 h-4 w-4 shrink-0 text-brass" strokeWidth={1.6} />{h}</li>
                ))}
              </ul>
            ) : null}
            {t.travelFacts?.length ? (
              <dl className="mt-12 grid grid-cols-2 gap-px border hairline bg-charcoal/10 md:grid-cols-3">
                {t.travelFacts.map((f) => (
                  <div key={f.label} className="bg-ivory p-5">
                    <dt className="field-label">{f.label}</dt>
                    <dd className="mt-2 text-charcoal">{f.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </section>

          {/* Itinerary */}
          {t.itinerary?.length ? (
            <section id="itinerary" className="scroll-mt-40">
              <p className="eyebrow mb-5">Day by day</p>
              <h2 className="display text-4xl text-ink md:text-5xl">Your itinerary</h2>
              <ol className="mt-12 space-y-0">
                {t.itinerary.map((d, i) => (
                  <Reveal as="li" key={i} className="grid grid-cols-[4.5rem_1fr] gap-6 border-t hairline py-10 md:grid-cols-[7rem_1fr]">
                    <div>
                      <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-taupe">Day</p>
                      <p className="display text-6xl leading-none text-ink md:text-7xl">{String(d.day).padStart(2, "0")}</p>
                    </div>
                    <div>
                      <h3 className="display text-3xl text-ink">{d.title}</h3>
                      {d.summary ? <p className="mt-3 leading-relaxed text-muted">{d.summary}</p> : null}
                      {d.items?.length ? (
                        <ul className="mt-6 space-y-3">
                          {d.items.map((it, j) => (
                            <li key={j} className="relative pl-6 text-charcoal before:absolute before:left-0 before:top-2.5 before:h-px before:w-3 before:bg-brass">{it}</li>
                          ))}
                        </ul>
                      ) : null}
                      {d.image?.url ? <Photo media={d.image} alt={d.title} className="mt-8 aspect-[16/10]" sizes="(min-width:1024px) 50vw, 100vw" /> : null}
                    </div>
                  </Reveal>
                ))}
              </ol>
            </section>
          ) : null}

          {/* Stay & meals */}
          <section id="stay" className="scroll-mt-40 grid gap-10 md:grid-cols-2">
            <div className="bg-paper p-8">
              <HomeIcon className="h-6 w-6 text-umber" strokeWidth={1.2} />
              <h3 className="display mt-5 text-3xl text-ink">Where you&apos;ll stay</h3>
              <div className="mt-4 space-y-3 text-muted">{paragraphs(t.stayInfo || "A private VHI home in Vrindavan, assigned to your group after booking.").map((p, i) => <p key={i}>{p}</p>)}</div>
            </div>
            <div className="bg-paper p-8">
              <Utensils className="h-6 w-6 text-umber" strokeWidth={1.2} />
              <h3 className="display mt-5 text-3xl text-ink">What you&apos;ll eat</h3>
              <div className="mt-4 space-y-3 text-muted">{paragraphs(t.mealInfo || "Freshly cooked sattvik vegetarian meals — no onion, no garlic.").map((p, i) => <p key={i}>{p}</p>)}</div>
            </div>
          </section>

          {/* Included / excluded */}
          <section id="included" className="scroll-mt-40 grid gap-12 md:grid-cols-2">
            <div>
              <p className="eyebrow mb-6">What&apos;s included</p>
              <ul className="space-y-3">
                {(t.inclusions ?? []).map((x) => <li key={x} className="flex gap-3 text-charcoal"><Check className="mt-1 h-4 w-4 shrink-0 text-success" strokeWidth={1.6} />{x}</li>)}
              </ul>
            </div>
            <div>
              <p className="eyebrow mb-6">Not included</p>
              <ul className="space-y-3">
                {(t.exclusions ?? []).map((x) => <li key={x} className="flex gap-3 text-muted"><X className="mt-1 h-4 w-4 shrink-0" strokeWidth={1.6} />{x}</li>)}
              </ul>
            </div>
          </section>

          {/* Pickup & vehicle */}
          <section id="travel" className="scroll-mt-40 grid gap-10 border-y hairline py-12 md:grid-cols-2">
            <div>
              <MapPin className="h-6 w-6 text-umber" strokeWidth={1.2} />
              <h3 className="display mt-4 text-3xl text-ink">Pickup & drop</h3>
              <div className="mt-4 space-y-3 text-muted">{paragraphs(t.pickupInfo).map((p, i) => <p key={i}>{p}</p>)}</div>
              {t.pickupPoints?.length ? (
                <ul className="mt-5 space-y-2 text-sm text-charcoal">{t.pickupPoints.map((p) => <li key={p}>· {p}</li>)}</ul>
              ) : null}
            </div>
            <div>
              <Car className="h-6 w-6 text-umber" strokeWidth={1.2} />
              <h3 className="display mt-4 text-3xl text-ink">Your vehicle</h3>
              <div className="mt-4 space-y-3 text-muted">{paragraphs(t.vehicleInfo).map((p, i) => <p key={i}>{p}</p>)}</div>
            </div>
          </section>

          {/* Important info */}
          {t.importantInfo?.length || policy ? (
            <section id="info" className="scroll-mt-40">
              <p className="eyebrow mb-6">Good to know</p>
              <ul className="space-y-4">
                {(t.importantInfo ?? []).map((x) => (
                  <li key={x} className="flex gap-3 text-charcoal"><Info className="mt-1 h-4 w-4 shrink-0 text-umber" strokeWidth={1.4} />{x}</li>
                ))}
              </ul>
              {policy ? (
                <div className="mt-8 bg-paper p-6">
                  <p className="font-medium text-ink">Cancellation</p>
                  <p className="mt-2 text-sm text-muted">{policy.summary}</p>
                  <Link href="/cancellation-policy" className="link-line mt-3 inline-block text-sm">Full policy →</Link>
                </div>
              ) : null}
            </section>
          ) : null}

          {t.gallery?.length ? (
            <section className="grid grid-cols-2 gap-3">
              {t.gallery.slice(0, 4).map((g, i) => <Photo key={i} media={g} alt={g.alt || t.title} className={i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"} sizes="50vw" />)}
            </section>
          ) : null}

          {testimonials.length ? (
            <section>
              <p className="eyebrow mb-6">From our pilgrims</p>
              {testimonials.map((r) => (
                <figure key={r._id} className="border-b hairline py-6">
                  <blockquote className="display text-2xl leading-snug text-ink">“{r.text}”</blockquote>
                  <figcaption className="mt-3 text-sm text-muted">{r.guestName}{r.city ? ` · ${r.city}` : ""}</figcaption>
                </figure>
              ))}
            </section>
          ) : null}

          {t.faqs?.length ? (
            <section id="faq" className="scroll-mt-40">
              <p className="eyebrow mb-6">Questions</p>
              <FaqList items={t.faqs} />
              <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: t.faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }} />
            </section>
          ) : <span id="faq" />}
        </div>

        <aside className="lg:col-span-5">
          <div className="space-y-4 lg:sticky lg:top-40">
            <TourBookingCard tour={t} whatsapp={wa} minGroup={minGroup} advanceDays={advanceDays} hasAddOns={addOns.length > 0} />
            {wa ? (
              <a href={whatsappLink(wa, `Radhe Radhe! Please send me the itinerary for ${t.title}.`)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-sm text-muted hover:text-ink">
                <FileDown className="h-4 w-4" strokeWidth={1.4} /> Get the itinerary on WhatsApp
              </a>
            ) : null}
          </div>
        </aside>
      </div>

      {/* Other journeys */}
      {related.length ? (
        <section className="bg-ink py-20 text-ivory md:py-28">
          <div className="container-x">
            <p className="eyebrow text-sand">Other Braj journeys</p>
            <h2 className="display mt-4 text-4xl md:text-6xl">Stay a little <span className="accent text-sand">longer.</span></h2>
            <div className="mt-14 grid gap-6 md:grid-cols-3">{related.map((r) => <TourCard key={r._id} t={r} />)}</div>
          </div>
        </section>
      ) : null}

      <section className="container-x flex flex-col items-start justify-between gap-8 py-20 md:flex-row md:items-center">
        <h2 className="display max-w-2xl text-4xl text-ink md:text-5xl">Ready when you are. <span className="accent">Radhe Radhe.</span></h2>
        <div className="flex flex-wrap gap-3">
          <a href="#book" className="btn btn-primary">Book this journey</a>
          {wa ? (
            <a href={whatsappLink(wa, `Radhe Radhe! I have a question about ${t.title}.`)} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              <MessageCircle className="h-4 w-4" strokeWidth={1.5} /> WhatsApp
            </a>
          ) : null}
        </div>
      </section>

      <div className="no-print fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t hairline bg-ivory px-5 py-3 lg:hidden">
        <p className="text-sm"><b className="font-semibold">{t.pricing.adultPrice ? formatINR(t.pricing.adultPrice) : ""}</b> <span className="text-muted">/ person</span></p>
        <a href="#book" className="btn btn-primary !py-3">Book</a>
      </div>
    </>
  );
}
