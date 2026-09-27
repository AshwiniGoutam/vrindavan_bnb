import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { FaqList } from "@/components/site/faq-list";
import { JsonLd } from "@/components/site/json-ld";
import { listFaqs } from "@/server/services/catalog.service";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "Frequently asked questions", description: "Check-in, meals, Darshan tours, payments and cancellations at VHI Vrindavan.", path: "/faq" });

const LABELS: Record<string, string> = { general: "General", stay: "Stays", stay_food: "Stay + Food", darshan: "Darshan Tours", payments: "Payments & cancellations" };

export default async function FaqPage() {
  const faqs = await listFaqs();
  const groups = Object.keys(LABELS).map((k) => ({ key: k, items: faqs.filter((f) => f.category === k) })).filter((g) => g.items.length);
  return (
    <section className="pb-24 pt-36 md:pt-44">
      <div className="container-x max-w-4xl">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "FAQ" }]} />
        <h1 className="display mt-8 text-5xl text-ink md:text-7xl">Questions, <span className="accent">answered.</span></h1>
        <div className="mt-16 space-y-16">
          {groups.map((g) => (
            <div key={g.key}>
              <p className="eyebrow mb-6">{LABELS[g.key]}</p>
              <FaqList items={g.items} />
            </div>
          ))}
          {!groups.length ? <p className="text-muted">FAQs will appear here once added in Admin → FAQs.</p> : null}
        </div>
      </div>
      {faqs.length ? <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }} /> : null}
    </section>
  );
}
