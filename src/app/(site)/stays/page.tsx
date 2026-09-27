import type { Metadata } from "next";
import { Suspense } from "react";
import { PropertyCard, TYPE_LABEL } from "@/components/site/cards";
import { StaysFilters } from "@/components/site/stays-filters";
import { Reveal } from "@/components/site/reveal";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { HeroSlider, type HeroSlide } from "@/components/site/hero-slider";
import { listBanners, listProperties } from "@/server/services/catalog.service";
import { isStayAvailable } from "@/server/services/availability.service";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Luxury Homestays in Vrindavan",
  description: "Private studios, apartments and a four-bedroom villa near Banke Bihari, Prem Mandir and ISKCON — book direct with VHI.",
  path: "/stays",
});

const dateRx = /^\d{4}-\d{2}-\d{2}$/;

export default async function StaysPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [allProperties, banners] = await Promise.all([
    listProperties({
      type: sp.type,
      guests: sp.guests ? Number(sp.guests) : undefined,
      sort: sp.sort === "price_asc" || sp.sort === "price_desc" ? sp.sort : "featured",
    }),
    listBanners("stays"),
  ]);
  let properties = allProperties;
  const withDates = sp.checkIn && sp.checkOut && dateRx.test(sp.checkIn) && dateRx.test(sp.checkOut) && sp.checkOut > sp.checkIn;
  if (withDates) {
    const checks = await Promise.all(properties.map((p) => isStayAvailable(p, sp.checkIn!, sp.checkOut!).then((r) => r.available).catch(() => true)));
    properties = properties.filter((_, i) => checks[i]);
  }

  // Admin → Banners (placement "Stays page"); falls back to this copy + a featured property photo.
  const slides: HeroSlide[] = banners.length
    ? banners.map((b) => ({ id: b._id, eyebrow: b.eyebrow, title: b.title, titleAccent: b.titleAccent, subtitle: b.subtitle, textTone: b.textTone, image: b.image, mobileImage: b.mobileImage, video: b.video, ctaLabel: b.ctaLabel, ctaHref: b.ctaHref }))
    : [
        {
          id: "stays-default",
          eyebrow: "Stays",
          title: "Homes in Vrindavan,",
          titleAccent: "for every kind of visit.",
          subtitle: "Whole homes — never shared — from quiet studios for two to a four-bedroom villa for family and satsang groups.",
          textTone: "dark",
          image: allProperties.find((p) => p.featuredImage?.url)?.featuredImage,
        },
      ];
  const lightTop = (slides[0].textTone ?? "dark") === "light";

  return (
    <>
      <HeroSlider variant="page" slides={slides} top={<Breadcrumbs light={lightTop} items={[{ label: "Home", href: "/" }, { label: "Stays" }]} />}>
        <div className="border hairline bg-ivory/95 p-2 shadow-[0_24px_60px_rgba(14,13,12,0.12)] backdrop-blur">
          <Suspense>
            <StaysFilters types={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))} />
          </Suspense>
        </div>
      </HeroSlider>

      <section id="results" className="container-x scroll-mt-24 py-16 md:py-24">
        <p className="mb-10 font-mono text-xs uppercase tracking-[0.18em] text-muted">
          {properties.length} {properties.length === 1 ? "home" : "homes"}
          {withDates ? " available for your dates" : ""}
        </p>
        {properties.length ? (
          <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p, i) => (
              <Reveal key={p._id} delay={(i % 3) * 90}>
                <PropertyCard p={p} priority={i < 3} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="border hairline bg-paper p-12 text-center">
            <p className="display text-3xl text-ink">No homes match — yet.</p>
            <p className="mt-3 text-muted">Try different dates or fewer filters, or message us and we&apos;ll find you a stay.</p>
          </div>
        )}
      </section>
    </>
  );
}