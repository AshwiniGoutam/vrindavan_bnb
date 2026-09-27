import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Photo } from "@/components/site/photo";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { PropertyCard, TourCard } from "@/components/site/cards";
import { FaqList } from "@/components/site/faq-list";
import { Icon } from "@/components/site/icon";
import { JsonLd } from "@/components/site/json-ld";
import { getSettings } from "@/server/services/settings.service";
import {
  listAddOns, listBanners, listExperiences, listFaqs, listFeaturedProperties, listHomepageOffers, listPackages, listReels, listTestimonials, listTours,
} from "@/server/services/catalog.service";
import { formatINR } from "@/lib/money";
import { appUrl, paragraphs, whatsappLink } from "@/lib/utils";
import { buildMetadata } from "@/lib/seo";
import { Reels } from "@/components/site/reels";
import { HeroSlider, type HeroSlide } from "@/components/site/hero-slider";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return buildMetadata({
    title: s.seo?.defaultTitle || "VHI · Luxury Homestays in Vrindavan",
    description: s.seo?.defaultDescription || "Private luxury homestays, sattvik food and guided Darshan journeys in Vrindavan.",
    path: "/",
    image: s.seo?.ogImage ?? s.home.heroImage,
  });
}

const DEFAULT_WHY = [
  { title: "Whole homes, not rooms", body: "Every VHI stay is a private apartment or villa — your own kitchen, living room and quiet, minutes from the temples." },
  { title: "Hosted by locals", body: "We live in Vrindavan. Darshan timings, aarti, the right ghat at the right hour — we'll tell you, and arrange it." },
  { title: "Sattvik by design", body: "Freshly cooked vegetarian meals without onion or garlic, served at home on longer stays." },
  { title: "One place for everything", body: "Pick-ups, cabs, scooty rentals and guided Braj journeys, booked with your stay." },
];

export default async function HomePage() {
  const [settings, banners, featured, tours, packages, experiences, testimonials, offers, addOns, faqs, reels] = await Promise.all([
    getSettings(),
    listBanners("home_hero"),
    listFeaturedProperties(6),
    listTours(),
    listPackages(),
    listExperiences(),
    listTestimonials(6),
    listHomepageOffers(),
    listAddOns(),
    listFaqs({ homepage: true }),
    listReels(),
  ]);
  const h = settings.home;
  const heroImage = banners[0]?.image ?? h.heroImage;
  // Every published "Homepage slider" banner is a slide; Settings → Homepage is the fallback slide.
  const slides: HeroSlide[] = banners.length
    ? banners.map((b) => ({ id: b._id, eyebrow: b.eyebrow, title: b.title, titleAccent: b.titleAccent, subtitle: b.subtitle, textTone: b.textTone, image: b.image, mobileImage: b.mobileImage, video: b.video, ctaLabel: b.ctaLabel, ctaHref: b.ctaHref }))
    : [
        {
          id: "default",
          eyebrow: h.heroEyebrow || "Luxury homestays in Vrindavan",
          title: h.heroTitle || "Vrindavan,",
          titleAccent: h.heroAccent || "as it’s meant to be experienced.",
          subtitle: h.heroSubtitle || "Comfortable stays, sattvik food and soulful darshan experiences for a more meaningful yatra.",
          textTone: "dark",
          image: h.heroImage,
        },
      ];
  const why = h.whyVhi?.length ? h.whyVhi : DEFAULT_WHY;
  const wa = settings.business.whatsapp;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LodgingBusiness",
          name: `${settings.business.brandName} — VHI Luxury Homestays`,
          url: appUrl(),
          telephone: settings.business.phone,
          email: settings.business.email,
          address: { "@type": "PostalAddress", addressLocality: "Vrindavan", addressRegion: "Uttar Pradesh", addressCountry: "IN" },
          image: heroImage?.url,
        }}
      />

      {/* ── Hero slider (Admin → Banners, placement “Homepage slider”) ── */}
      <HeroSlider
        slides={slides}
        whatsapp={settings.business.whatsapp}
        tours={tours.map((t) => ({ slug: t.slug, title: t.title, durationLabel: t.durationLabel, minGroupSize: t.minGroupSize ?? settings.booking.defaultMinGroupSize, advanceDays: t.advanceDays ?? settings.booking.defaultAdvanceDays }))}
      />

      {/* ── The Vrindavan experience ── */}
      <section className="section">
        <div className="container-x grid items-center gap-14 lg:grid-cols-12">
          <Reveal className="lg:col-span-6">
            <p className="eyebrow mb-6">The experience</p>
            <h2 className="display text-4xl text-ink md:text-6xl">{h.introTitle || "Vrindavan isn't a place you visit. It's a rhythm you fall into."}</h2>
            <div className="mt-8 max-w-xl space-y-5 text-lg leading-relaxed text-muted">
              {(paragraphs(h.introBody).length ? paragraphs(h.introBody) : [
                "Mangla aarti before dawn. The parikrama path at golden hour. Kirtan drifting from a courtyard you didn't know was there.",
                "VHI homes are built around that rhythm — close enough to walk to darshan, calm enough to come back to. You bring the devotion; we take care of everything else.",
              ]).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </Reveal>
          <Reveal className="lg:col-span-5 lg:col-start-8" delay={150}>
            <Photo media={h.introImage} alt="Vrindavan" className="aspect-[4/4]" sizes="(min-width:1024px) 40vw, 100vw" label="Vrindavan" />
          </Reveal>
        </div>
      </section>

      {/* ── Three ways to stay ── */}
      <section className="hairline bg-paper section">
        <div className="container-x">
          <SectionHeading eyebrow="Three ways to experience Vrindavan" title="Choose how you'd like" accent="to arrive." />
          <div className="mt-10 grid gap-px bg-charcoal/10 md:grid-cols-3">
            {[
              { n: "01", title: "Stay", body: "Private studios, apartments and a four-bedroom villa — for couples, families and satsang groups.", href: "/stays", image: featured[0]?.featuredImage },
              { n: "02", title: "Stay + Sattvik Food", body: "Three, five or seven nights with home-cooked sattvik breakfast and dinner, and a curated local itinerary.", href: "/stay-food", image: packages[0]?.heroImage ?? h.foodImage },
              { n: "03", title: "Darshan Tours", body: "Guided journeys through Vrindavan, Mathura, Govardhan and Barsana — stay, meals and transport included.", href: "/darshan-tours", image: tours[0]?.heroImage },
            ].map((o, i) => (
              <Reveal key={o.n} delay={i * 120} className="group bg-paper">
                <Link href={o.href} className="flex h-full flex-col p-6 md:p-8">
                  <div className="img-zoom">
                    <Photo media={o.image} alt={o.title} className="aspect-[4/4]" sizes="(min-width:768px) 33vw, 100vw" label={o.title} />
                  </div>
                  <div className="mt-8 flex items-baseline justify-between">
                    <span className="font-mono text-xs text-taupe">{o.n}</span>
                    <ArrowRight className="h-5 w-5 transition-transform duration-500 group-hover:translate-x-1" strokeWidth={1.3} />
                  </div>
                  <h3 className="display mt-3 text-4xl text-ink">{o.title}</h3>
                  <p className="mt-4 leading-relaxed text-muted">{o.body}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured stays ── */}
      {featured.length ? (
        <section className="section">
          <div className="container-x">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <SectionHeading eyebrow="Featured stays" title="Homes with" accent="a sense of place." />
              <Link href="/stays" className="link-line self-start text-sm font-medium md:self-auto">View all {featured.length > 1 ? "stays" : ""} →</Link>
            </div>
            <div className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {featured.slice(0, 6).map((p, i) => (
                <Reveal key={p._id} delay={(i % 3) * 100}>
                  <PropertyCard p={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Darshan highlight ── */}
      {tours.length ? (
        <section className="section bg-ink text-ivory">
          <div className="container-x grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <SectionHeading light eyebrow="Darshan Tours" title="Walk the land of" accent="Krishna." intro="Unhurried, guided journeys across Braj — with a VHI home to return to each night, sattvik meals and a driver who knows every lane." />
              <ul className="mt-10 space-y-3 text-sm text-sand">
                <li>· Minimum {tours[0].minGroupSize} guests per booking</li>
                <li>· Book at least {tours[0].advanceDays} days ahead</li>
                <li>· Stay, meals, vehicle & guide included</li>
              </ul>
              <Link href="/darshan-tours" className="btn btn-ghost-light mt-10">All journeys</Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:col-span-8">
              {tours.slice(0, 4).map((t, i) => (
                <Reveal key={t._id} delay={i * 100} className={i === 0 && tours.length % 2 === 1 ? "sm:col-span-2" : ""}>
                  <TourCard t={t} large={i === 0 && tours.length % 2 === 1} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Sattvik food ── */}
      <section className="section">
        <div className="container-x grid items-center gap-14 lg:grid-cols-12">
          <Reveal className="order-2 lg:order-1 lg:col-span-6">
            <Photo media={h.foodImage} alt="Sattvik thali" className="aspect-[5/4]" sizes="(min-width:1024px) 50vw, 100vw" label="Sattvik food" />
          </Reveal>
          <Reveal className="order-1 lg:order-2 lg:col-span-5 lg:col-start-8" delay={120}>
            <p className="eyebrow mb-6">Sattvik food</p>
            <h2 className="display text-4xl text-ink md:text-6xl">{h.foodTitle || "Prasadam-style meals, cooked fresh at home."}</h2>
            <div className="mt-8 space-y-5 text-lg leading-relaxed text-muted">
              {(paragraphs(h.foodBody).length ? paragraphs(h.foodBody) : ["Pure vegetarian, no onion or garlic — dal, seasonal sabzi, phulkas, kheer. Choose breakfast, or breakfast and dinner, on stays of three nights or more."]).map((p, i) => <p key={i}>{p}</p>)}
            </div>
            {packages.length ? (
              <div className="mt-10 grid grid-cols-3 gap-px bg-charcoal/10">
                {packages.slice(0, 3).map((p) => (
                  <Link key={p._id} href={`/stay-food/${p.slug}`} className="group bg-ivory p-5 transition-colors hover:bg-paper">
                    <p className="display text-5xl text-ink">{p.nights}</p>
                    <p className="eyebrow mt-1">nights</p>
                    <p className="mt-4 text-xs text-muted group-hover:text-charcoal">View →</p>
                  </Link>
                ))}
              </div>
            ) : (
              <Link href="/stay-food" className="btn btn-outline mt-10">Stay + Food packages</Link>
            )}
          </Reveal>
        </div>
      </section>

      {/* ── Temples & experiences ── */}
      {experiences.length ? (
        <section className="section border-t hairline bg-paper">
          <div className="container-x">
            <SectionHeading eyebrow="Around your stay" title="Temples, ghats" accent="& quiet corners." align="center" />
            <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
              {experiences.map((e, i) => (
                <Reveal key={e._id} delay={(i % 4) * 90}>
                  <Photo media={e.image} alt={e.title} className="aspect-[3/4]" sizes="(min-width:1024px) 25vw, 50vw" label={e.category} />
                  <p className="eyebrow mt-5 text-[0.62rem]">{e.category}</p>
                  <h3 className="display mt-2 text-2xl text-ink">{e.title}</h3>
                  {e.description ? <p className="mt-2 text-sm leading-relaxed text-muted">{e.description}</p> : null}
                  {e.bestTime ? <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-taupe">Best · {e.bestTime}</p> : null}
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Why VHI ── */}
      <section className="section">
        <div className="container-x">
          <SectionHeading eyebrow="Why VHI" title="Hospitality," accent="the Braj way." />
          <div className="mt-16 grid gap-10 border-t hairline pt-12 sm:grid-cols-2 lg:grid-cols-4">
            {why.map((w, i) => (
              <Reveal key={i} delay={i * 100}>
                <p className="font-mono text-xs text-taupe">0{i + 1}</p>
                <h3 className="display mt-4 text-3xl text-ink">{w.title}</h3>
                <p className="mt-4 leading-relaxed text-muted">{w.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      {testimonials.length ? (
        <section className="section bg-linen/60">
          <div className="container-x">
            <SectionHeading eyebrow="Guest words" title="Stays that" accent="stayed with them." align="center" />
            <div className="no-scrollbar -mx-5 mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
              {testimonials.slice(0, 3).map((t) => (
                <figure key={t._id} className="w-[85%] shrink-0 snap-start bg-ivory p-8 md:w-auto">
                  <p className="text-brass" aria-label={`${t.rating} out of 5`}>{"★".repeat(t.rating)}</p>
                  <blockquote className="display mt-6 text-2xl leading-snug text-ink">“{t.text}”</blockquote>
                  <figcaption className="mt-8 border-t hairline pt-5 text-sm text-muted">
                    <span className="font-medium text-charcoal">{t.guestName}</span>
                    {t.city ? ` · ${t.city}` : ""}
                    {t.stayedIn ? ` · ${t.stayedIn}` : ""}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Reels ── */}
      {reels.length ? <Reels reels={reels} instagram={settings.business.instagram} /> : null}

      {/* ── Offers ── */}
      {offers.length ? (
        <section className="section">
          <div className="container-x">
            <SectionHeading eyebrow="Offers" title="A little more" accent="for longer stays." />
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {offers.map((o) => (
                <div key={o._id} className="flex flex-col justify-between border border-charcoal/80 p-8">
                  <div>
                    {o.badgeText ? <p className="eyebrow text-brass">{o.badgeText}</p> : null}
                    <h3 className="display mt-4 text-3xl text-ink">{o.title || o.name}</h3>
                    {o.description ? <p className="mt-4 leading-relaxed text-muted">{o.description}</p> : null}
                  </div>
                  <p className="mt-8 text-xs text-muted">Applied automatically at checkout{o.endsAt ? ` · until ${o.endsAt}` : ""}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Add-on services ── */}
      {addOns.length ? (
        <section className="section border-t hairline bg-paper">
          <div className="container-x grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <SectionHeading eyebrow="Add-on services" title="We'll handle" accent="the rest." intro="Add these while booking, or ask us on WhatsApp during your stay." />
            </div>
            <div className="grid gap-px bg-charcoal/10 sm:grid-cols-2 lg:col-span-8">
              {addOns.slice(0, 6).map((a) => (
                <div key={a._id} className="flex gap-5 bg-paper p-7">
                  <Icon name={a.icon} className="h-6 w-6 shrink-0 text-umber" />
                  <div>
                    <h3 className="text-lg font-medium text-ink">{a.name}</h3>
                    {a.description ? <p className="mt-2 text-sm leading-relaxed text-muted">{a.description}</p> : null}
                    <p className="mt-3 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-umber">
                      {a.pricingUnit === "on_request" || !a.price ? "On request" : `${formatINR(a.price)} ${a.pricingUnit.replace("per_", "/ ").replace("_", " ")}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── FAQ ── */}
      {faqs.length ? (
        <section className="section">
          <div className="container-x grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <SectionHeading eyebrow="Questions" title="Good to" accent="know." />
              <Link href="/faq" className="link-line mt-8 inline-block text-sm font-medium">All FAQs →</Link>
            </div>
            <div className="lg:col-span-8">
              <FaqList items={faqs.slice(0, 6)} />
            </div>
          </div>
          <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.slice(0, 6).map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }} />
        </section>
      ) : null}

      {/* ── CTA ── */}
      <section className="bg-charcoal text-ivory">
        <div className="container-x flex flex-col items-start justify-between gap-10 py-20 md:flex-row md:items-end md:py-28">
          <div>
            <p className="eyebrow text-sand">Plan your visit</p>
            <h2 className="display mt-5 max-w-3xl text-5xl md:text-7xl">
              Your room in Vrindavan <span className="accent text-sand">is waiting.</span>
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/stays" className="btn btn-light">Check availability</Link>
            {wa ? (
              <a href={whatsappLink(wa, "Radhe Radhe! I'd like help planning a stay in Vrindavan.")} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-light">
                <MessageCircle className="h-4 w-4" strokeWidth={1.5} /> WhatsApp us
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}