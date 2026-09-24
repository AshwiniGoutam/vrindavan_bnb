import Link from "next/link";
import { ArrowUpRight, BedDouble, Heart, Star, Users } from "lucide-react";
import Photo from "@/components/site/Photo";
import { inr } from "@/lib/utils";

export type CardStay = {
  slug: string; title: string; city: string; state: string; images: string[];
  bedrooms: number; maxGuests: number; basePrice: number; rating: number; reviewCount: number; type: string;
};

export default function StayCard({ stay }: { stay: CardStay }) {
  return (
    <Link href={`/stays/${stay.slug}`} className="home-stay-card group block">
      <div className="relative aspect-[1.02/1] overflow-hidden rounded-[1.35rem] bg-mist">
        <Photo src={stay.images[0]} alt={stay.title} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.045]" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <span className="rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-pine">{stay.type}</span>
          <span className="flex size-9 items-center justify-center rounded-full bg-white/90 text-pine backdrop-blur"><Heart size={16} /></span>
        </div>
        <div className="absolute inset-x-0 bottom-0 translate-y-3 p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="inline-flex items-center gap-2 rounded-full bg-pine px-4 py-2 text-xs font-semibold text-white">View stay <ArrowUpRight size={14} /></span>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl leading-tight">{stay.title}</h3>
            <p className="mt-1 text-sm text-stone">{stay.city}, {stay.state}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-sm font-semibold"><Star size={14} className="fill-marigold text-marigold" />{stay.rating.toFixed(1)}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone">
          <span className="flex items-center gap-1.5"><BedDouble size={15} /> {stay.bedrooms} bedrooms</span>
          <span className="flex items-center gap-1.5"><Users size={15} /> up to {stay.maxGuests}</span>
        </div>
        <p className="mt-3"><span className="text-base font-bold">{inr(stay.basePrice)}</span> <span className="text-sm text-stone">/ night + taxes</span></p>
      </div>
    </Link>
  );
}
