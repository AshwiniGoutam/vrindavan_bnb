import Link from "next/link";
import { ArrowUpRight, BedDouble, Users, Bath } from "lucide-react";
import { formatINR } from "@/lib/money";
import type { PackageDTO, PropertyDTO, TourDTO } from "@/server/types";
import { Photo } from "./photo";

export const TYPE_LABEL: Record<string, string> = { studio: "Studio", "1bhk": "1 BHK", "2bhk": "2 BHK", "3bhk": "3 BHK", "4bhk": "4 BHK", villa: "Villa" };

export function PropertyCard({ p, priority }: { p: PropertyDTO; priority?: boolean }) {
  const onSale = p.pricing.compareAtRate && p.pricing.compareAtRate > p.pricing.baseRate;
  return (
    <Link href={`/stays/${p.slug}`} className="group block">
      <div className="img-zoom relative">
        <Photo media={p.featuredImage ?? p.gallery?.[0]} alt={p.featuredImage?.alt || p.name} className="aspect-[4/4]" sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" priority={priority} crop="ar_4:5" label={p.name} />
        <div className="absolute left-4 top-4 flex gap-2">
          <span className="bg-ivory/90 px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ink">{TYPE_LABEL[p.type] ?? p.type}</span>
          {p.label ? <span className="bg-ink/85 px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ivory">{p.label}</span> : null}
        </div>
        {p.status === "maintenance" ? <span className="absolute bottom-4 left-4 bg-ivory px-3 py-1.5 text-xs text-umber">Temporarily unavailable</span> : null}
      </div>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="display text-[1.75rem] leading-tight text-ink">{p.name}</h3>
          <p className="mt-1 text-sm text-muted">{p.location?.area ? `${p.location.area}, ` : ""}{p.location?.city ?? "Vrindavan"}</p>
        </div>
        <ArrowUpRight className="mt-2 h-5 w-5 shrink-0 text-umber transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.3} />
      </div>
      <div className="mt-4 flex items-center gap-5 border-t hairline pt-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" strokeWidth={1.4} />{p.bedrooms} bed</span>
        <span className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5" strokeWidth={1.4} />{p.bathrooms} bath</span>
        <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" strokeWidth={1.4} />Up to {p.occupancy.maxGuests}</span>
        {p.pricing.baseRate > 0 ? (
          <span className="ml-auto text-right text-charcoal">
            {onSale ? <s className="mr-1.5 text-muted">{formatINR(p.pricing.compareAtRate!)}</s> : null}
            <b className="font-semibold">{formatINR(p.pricing.baseRate)}</b>
            <span className="text-muted"> / night</span>
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function TourCard({ t, large }: { t: TourDTO; large?: boolean }) {
  return (
    <Link href={`/darshan-tours/${t.slug}`} className="group relative block overflow-hidden bg-ink text-ivory">
      <Photo media={t.heroImage ?? t.gallery?.[0]} alt={t.title} className={large ? "aspect-[4/4] md:aspect-[16/11]" : "aspect-[4/4]"} imgClassName="opacity-80 transition duration-[1400ms] group-hover:scale-[1.04] group-hover:opacity-70" sizes="(min-width:1024px) 40vw, 100vw" label="Darshan" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
        <p className="eyebrow text-sand">{t.durationLabel}</p>
        <h3 className="display mt-3 text-3xl md:text-4xl">{t.title}</h3>
        <div className="mt-5 flex items-end justify-between border-t border-white/20 pt-4">
          <p className="text-sm text-sand">
            {t.pricing.adultPrice > 0 ? (
              <>
                <span className="display text-2xl text-ivory">{formatINR(t.pricing.adultPrice)}</span> per person
              </>
            ) : (
              "Price on request"
            )}
          </p>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em]">Min. {t.minGroupSize} guests</span>
        </div>
      </div>
    </Link>
  );
}

export function PackageCard({ p }: { p: PackageDTO }) {
  return (
    <Link href={`/stay-food/${p.slug}`} className="group block border hairline bg-paper p-3 transition-colors duration-500 hover:bg-ivory">
      <div className="img-zoom">
        <Photo media={p.heroImage} alt={p.title} className="aspect-[5/4]" sizes="(min-width:1024px) 33vw, 100vw" label={`${p.nights} nights`} />
      </div>
      <div className="px-3 pb-4 pt-6">
        <div className="flex items-baseline justify-between">
          <p className="display text-6xl text-ink">{p.nights}</p>
          <p className="eyebrow">Nights</p>
        </div>
        <h3 className="display mt-4 text-2xl text-ink">{p.title}</h3>
        {p.tagline ? <p className="mt-2 text-sm leading-relaxed text-muted">{p.tagline}</p> : null}
        <p className="mt-5 flex items-center justify-between border-t hairline pt-4 text-sm">
          <span className="text-muted">{p.pricingMode === "dynamic" ? "Stay rate + meal plan" : p.price ? `From ${formatINR(p.price)}` : "View details"}</span>
          <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.3} />
        </p>
      </div>
    </Link>
  );
}
