import Link from "next/link";
import { Instagram, Facebook, Youtube, Mail, Phone, MapPin } from "lucide-react";
import type { SettingsDTO } from "@/server/types";
import { whatsappLink } from "@/lib/utils";

export function Footer({ settings }: { settings: SettingsDTO }) {
  const b = settings.business;
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ink text-sand">
      <div className="container-x grid gap-14 py-20 md:grid-cols-12">
        <div className="md:col-span-4">
          <img src="/brand/vhi-logo-light.png" alt="VHI Luxury Homestays" className="h-16 w-auto" />
          <p className="mt-6 max-w-sm leading-relaxed text-sand/80">
            Private homes in the heart of Braj — made for slow mornings, temple evenings and sattvik meals. {b.brandName}.
          </p>
          <div className="mt-8 flex gap-4">
            {b.instagram ? (
              <a href={b.instagram} aria-label="Instagram" target="_blank" rel="noopener noreferrer" className="hover:text-ivory">
                <Instagram className="h-5 w-5" strokeWidth={1.3} />
              </a>
            ) : null}
            {b.facebook ? (
              <a href={b.facebook} aria-label="Facebook" target="_blank" rel="noopener noreferrer" className="hover:text-ivory">
                <Facebook className="h-5 w-5" strokeWidth={1.3} />
              </a>
            ) : null}
            {b.youtube ? (
              <a href={b.youtube} aria-label="YouTube" target="_blank" rel="noopener noreferrer" className="hover:text-ivory">
                <Youtube className="h-5 w-5" strokeWidth={1.3} />
              </a>
            ) : null}
          </div>
        </div>

        <div className="md:col-span-2">
          <p className="eyebrow mb-5 text-taupe">Stay</p>
          <ul className="space-y-3 text-sm">
            <li><Link className="link-line hover:text-ivory" href="/stays">All stays</Link></li>
            <li><Link className="link-line hover:text-ivory" href="/stay-food">Stay + Sattvik Food</Link></li>
            <li><Link className="link-line hover:text-ivory" href="/darshan-tours">Darshan Tours</Link></li>
          </ul>
        </div>
        <div className="md:col-span-2">
          <p className="eyebrow mb-5 text-taupe">VHI</p>
          <ul className="space-y-3 text-sm">
            <li><Link className="link-line hover:text-ivory" href="/about">About</Link></li>
            <li><Link className="link-line hover:text-ivory" href="/faq">FAQ</Link></li>
            <li><Link className="link-line hover:text-ivory" href="/contact">Contact</Link></li>
            <li><Link className="link-line hover:text-ivory" href="/cancellation-policy">Cancellation policy</Link></li>
          </ul>
        </div>
        <div className="md:col-span-4">
          <p className="eyebrow mb-5 text-taupe">Reach us</p>
          <ul className="space-y-4 text-sm">
            {b.phone ? (
              <li className="flex gap-3"><Phone className="h-4 w-4 shrink-0" strokeWidth={1.3} /><a href={`tel:${b.phone.replace(/\s/g, "")}`} className="hover:text-ivory">{b.phone}</a></li>
            ) : null}
            {b.whatsapp ? (
              <li className="flex gap-3"><span className="h-4 w-4 shrink-0 text-center font-mono text-[0.6rem]">WA</span><a href={whatsappLink(b.whatsapp)} className="hover:text-ivory" target="_blank" rel="noopener noreferrer">WhatsApp us</a></li>
            ) : null}
            {b.email ? (
              <li className="flex gap-3"><Mail className="h-4 w-4 shrink-0" strokeWidth={1.3} /><a href={`mailto:${b.email}`} className="hover:text-ivory">{b.email}</a></li>
            ) : null}
            {b.address ? (
              <li className="flex gap-3"><MapPin className="h-4 w-4 shrink-0" strokeWidth={1.3} /><span className="whitespace-pre-line">{b.address}</span></li>
            ) : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-taupe md:flex-row md:items-center md:justify-between">
          <p>© {year} {b.legalName || b.brandName}. All rights reserved.{b.gstin ? ` GSTIN ${b.gstin}` : ""}</p>
          <div className="flex gap-6">
            <Link href="/privacy-policy" className="hover:text-ivory">Privacy</Link>
            <Link href="/terms" className="hover:text-ivory">Terms</Link>
            <Link href="/cancellation-policy" className="hover:text-ivory">Cancellations</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
