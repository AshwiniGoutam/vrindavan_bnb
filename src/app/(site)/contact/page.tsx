import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { EnquiryForm } from "@/components/booking/enquiry-form";
import { getSettings } from "@/server/services/settings.service";
import { buildMetadata } from "@/lib/seo";
import { whatsappLink } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({ title: "Contact VHI", description: "Call, WhatsApp or write to VHI Luxury Homestays in Vrindavan.", path: "/contact" });

export default async function ContactPage() {
  const s = await getSettings();
  const b = s.business;
  const guestContacts = s.contacts.filter((c) => c.showToGuests);
  return (
    <section className="pb-24 pt-36 md:pt-44">
      <div className="container-x grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
          <h1 className="display mt-8 text-5xl text-ink md:text-7xl">Talk to <span className="accent">us.</span></h1>
          <p className="mt-6 text-lg text-muted">We usually reply on WhatsApp within minutes during the day.</p>
          <ul className="mt-12 space-y-6">
            {b.whatsapp ? (
              <li><a href={whatsappLink(b.whatsapp, "Radhe Radhe!")} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 text-lg text-ink"><MessageCircle className="h-5 w-5 text-umber" strokeWidth={1.3} /> WhatsApp</a></li>
            ) : null}
            {b.phone ? (
              <li><a href={`tel:${b.phone.replace(/\s/g, "")}`} className="flex items-center gap-4 text-lg text-ink"><Phone className="h-5 w-5 text-umber" strokeWidth={1.3} /> {b.phone}</a></li>
            ) : null}
            {b.email ? (
              <li><a href={`mailto:${b.email}`} className="flex items-center gap-4 text-lg text-ink"><Mail className="h-5 w-5 text-umber" strokeWidth={1.3} /> {b.email}</a></li>
            ) : null}
            {b.address ? (
              <li className="flex items-start gap-4 text-lg text-ink"><MapPin className="mt-1 h-5 w-5 text-umber" strokeWidth={1.3} /> <span className="whitespace-pre-line">{b.address}</span></li>
            ) : null}
          </ul>
          {guestContacts.length ? (
            <div className="mt-12 border-t hairline pt-8">
              <p className="eyebrow mb-4">Trusted local services</p>
              <ul className="space-y-2 text-sm">
                {guestContacts.map((c) => <li key={c.phone}>{c.role}: {c.name} · <a className="underline" href={`tel:${c.phone}`}>{c.phone}</a></li>)}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <div className="border hairline bg-paper p-6 md:p-10">
            <p className="eyebrow mb-6">Send an enquiry</p>
            <EnquiryForm type="general" />
          </div>
        </div>
      </div>
    </section>
  );
}
