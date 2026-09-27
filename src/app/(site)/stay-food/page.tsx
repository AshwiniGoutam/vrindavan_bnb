import type { Metadata } from "next";
import { PackageCard } from "@/components/site/cards";
import { Reveal } from "@/components/site/reveal";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { FaqList } from "@/components/site/faq-list";
import { Photo } from "@/components/site/photo";
import { listFaqs, listMealPlans, listPackages } from "@/server/services/catalog.service";
import { getSettings } from "@/server/services/settings.service";
import { buildMetadata } from "@/lib/seo";
import { formatINR } from "@/lib/money";
import { paragraphs } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Stay + Sattvik Food Packages",
  description: "Three, five or seven nights in a private VHI home with freshly cooked sattvik breakfast and dinner, and a curated Vrindavan itinerary.",
  path: "/stay-food",
});

export default async function StayFoodPage() {
  const [packages, meals, faqs, settings] = await Promise.all([listPackages(), listMealPlans(), listFaqs({ category: "stay_food" }), getSettings()]);
  const h = settings.home;
  return (
    <>
      <section className="pb-16 pt-36 md:pt-44">
        <div className="container-x grid items-end gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Stay + Food" }]} />
            <h1 className="display mt-8 text-5xl text-ink md:text-8xl">
              Stay, eat, <span className="accent">slow down.</span>
            </h1>
            <div className="mt-8 max-w-xl space-y-4 text-lg text-muted">
              {(paragraphs(h.foodBody).length ? paragraphs(h.foodBody) : ["A private home, sattvik meals cooked fresh each day, and an itinerary that leaves room for the unplanned."]).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
          <div className="lg:col-span-5">
            <Photo media={h.foodImage} alt="Sattvik meal" className="aspect-[4/4]" label="Sattvik food" />
          </div>
        </div>
      </section>

      <section className="border-t hairline bg-paper py-20 md:py-28">
        <div className="container-x">
          <p className="eyebrow">Packages</p>
          {packages.length ? (
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {packages.map((p, i) => (
                <Reveal key={p._id} delay={i * 100}>
                  <PackageCard p={p} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="mt-8 text-muted">Packages are being prepared — message us to plan a stay with meals.</p>
          )}
        </div>
      </section>

      {meals.length ? (
        <section className="container-x py-20 md:py-28">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="eyebrow">Meal plans</p>
              <h2 className="display mt-4 text-4xl text-ink md:text-5xl">Add meals to <span className="accent">any stay.</span></h2>
            </div>
            <div className="grid gap-px bg-charcoal/10 md:grid-cols-2 lg:col-span-8">
              {meals.map((m) => (
                <div key={m._id} className="bg-ivory p-8">
                  <h3 className="display text-3xl text-ink">{m.name}</h3>
                  {m.description ? <p className="mt-3 text-muted">{m.description}</p> : null}
                  <p className="mt-6 text-sm text-charcoal">
                    {formatINR(m.adultPrice)} per adult{m.pricingModel === "per_person_per_night" ? " per night" : ""}
                    {m.childPrice ? ` · ${formatINR(m.childPrice)} per child (${m.childAgeMin}–${m.childAgeMax})` : ""}
                  </p>
                  <p className="mt-2 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-umber">Stays of {m.nightsRule === "gt" ? `more than ${m.minNights}` : `${m.minNights}+`} nights</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {faqs.length ? (
        <section className="container-x pb-24">
          <FaqList items={faqs} />
        </section>
      ) : null}
    </>
  );
}
