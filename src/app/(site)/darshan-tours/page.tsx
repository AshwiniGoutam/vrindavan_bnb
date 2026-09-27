import type { Metadata } from "next";
import { TourCard } from "@/components/site/cards";
import { Reveal } from "@/components/site/reveal";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { EnquiryForm } from "@/components/booking/enquiry-form";
import { FaqList } from "@/components/site/faq-list";
import { listFaqs, listTours } from "@/server/services/catalog.service";
import { getSettings } from "@/server/services/settings.service";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Darshan Tours in Vrindavan & Braj",
  description: "Guided Darshan journeys through Vrindavan, Mathura, Govardhan, Barsana and Nandgaon — stay, sattvik meals, vehicle and guide included.",
  path: "/darshan-tours",
});

export default async function DarshanToursPage() {
  const [tours, faqs, settings] = await Promise.all([listTours(), listFaqs({ category: "darshan" }), getSettings()]);
  return (
    <>
      <section className="bg-ink pb-20 pt-36 text-ivory md:pb-28 md:pt-44">
        <div className="container-x">
          <Breadcrumbs light items={[{ label: "Home", href: "/" }, { label: "Darshan Tours" }]} />
          <h1 className="display mt-8 max-w-5xl text-5xl md:text-8xl">
            Journeys through Braj, <span className="accent text-sand">at the pace of devotion.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-sand">
            Every tour includes a VHI home, sattvik meals, a private vehicle with an experienced local driver, and temple timings planned around aarti — not traffic.
          </p>
          <div className="mt-10 flex flex-wrap gap-x-10 gap-y-3 font-mono text-xs uppercase tracking-[0.18em] text-sand">
            <span>Min. {tours[0]?.minGroupSize ?? settings.booking.defaultMinGroupSize} guests</span>
            <span>Book {tours[0]?.advanceDays ?? settings.booking.defaultAdvanceDays}+ days ahead</span>
            <span>All-inclusive</span>
          </div>
        </div>
      </section>

      <section className="container-x py-20 md:py-28">
        {tours.length ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {tours.map((t, i) => (
              <Reveal key={t._id} delay={(i % 3) * 100}>
                <TourCard t={t} />
                <ul className="mt-5 space-y-2 text-sm text-muted">
                  {(t.highlights ?? []).slice(0, 3).map((h) => <li key={h}>· {h}</li>)}
                </ul>
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted">New journeys are being prepared. Enquire below and we&apos;ll plan one for you.</p>
        )}
      </section>

      <section className="border-t hairline bg-paper py-20 md:py-28">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow">Custom journeys</p>
            <h2 className="display mt-5 text-4xl text-ink md:text-5xl">Planning something <span className="accent">different?</span></h2>
            <p className="mt-5 text-muted">Larger groups, elderly parents, a specific festival, Govardhan parikrama on foot — tell us and we&apos;ll shape the days around you.</p>
          </div>
          <div className="lg:col-span-8">
            <EnquiryForm type="custom_tour" subject="Custom Darshan tour" />
          </div>
        </div>
      </section>

      {faqs.length ? (
        <section className="container-x py-20">
          <h2 className="display mb-10 text-4xl text-ink">Darshan tour questions</h2>
          <FaqList items={faqs} />
        </section>
      ) : null}
    </>
  );
}
