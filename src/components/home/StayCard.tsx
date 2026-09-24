import Link from "next/link";
import {
  ArrowUpRight,
  BedDouble,
  Heart,
  MapPin,
  Star,
  Users,
  Share2,
} from "lucide-react";

import Photo from "@/components/site/Photo";
import { inr } from "@/lib/utils";

export type CardStay = {
  id?: string;
  slug: string;
  title: string;
  city: string;
  state: string;
  images: string[];
  bedrooms: number;
  maxGuests: number;
  basePrice: number;
  rating: number;
  reviewCount: number;
  type: string;
};

export default function StayCard({
  stay,
}: {
  stay: CardStay;
}) {
  return (
    <article className="group overflow-hidden rounded-[12px] border border-[#dcd9d3] bg-white transition-shadow duration-300 hover:shadow-[0_12px_35px_rgba(30,28,24,0.08)]">

      <div className="grid lg:grid-cols-[300px_minmax(0,1fr)_178px]">

        {/* =====================================================
            IMAGE
        ===================================================== */}

        <Link
          href={`/stays/${stay.slug}`}
          className="relative block h-[250px] overflow-hidden lg:h-[245px]"
        >

          <Photo
            src={stay.images?.[0]}
            alt={stay.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
          />

          {/* image gradient */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />

          {/* type */}
          <div className="absolute left-3 top-3">
            <span className="rounded-md bg-white/95 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#292723] shadow-sm">
              {stay.type}
            </span>
          </div>

          {/* actions */}
          <div className="absolute right-3 top-3 flex flex-col gap-2">

            <span
  aria-label="Save stay"
  className="flex size-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65"
>
  <Heart size={16} />
</span>

<span
  aria-label="Share stay"
  className="flex size-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65"
>
  <Share2 size={15} />
</span>

          </div>

          {/* image indicator */}
          {stay.images?.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
              {stay.images.slice(0, 5).map((_, index) => (
                <span
                  key={index}
                  className={`size-1.5 rounded-full ${
                    index === 0
                      ? "bg-white"
                      : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}
        </Link>

        {/* =====================================================
            DETAILS
        ===================================================== */}

        <div className="flex min-w-0 flex-col justify-between px-5 py-5">

          <div>

            <div className="flex items-start justify-between gap-4">

              <Link
                href={`/stays/${stay.slug}`}
                className="min-w-0"
              >
                <h2 className="text-[20px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#20231f] transition-colors group-hover:text-[#506449]">
                  {stay.title}
                </h2>
              </Link>

              <div className="flex shrink-0 items-center gap-1 rounded-md bg-[#f5f3ee] px-2 py-1">
                <Star
                  size={12}
                  className="fill-[#c29543] text-[#c29543]"
                />

                <span className="text-[11px] font-semibold">
                  {stay.rating?.toFixed(1) ?? "New"}
                </span>
              </div>
            </div>

            {/* location */}
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#6f6b64]">
              <MapPin size={12} />
              <span>
                {stay.city}, {stay.state}
              </span>
            </div>

            {/* capacity */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[#4e4a44]">

              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-[#77736d]" />
                Up to {stay.maxGuests} Guests
              </span>

              <span className="h-3 w-px bg-[#ddd9d2]" />

              <span className="flex items-center gap-1.5">
                <BedDouble size={14} className="text-[#77736d]" />
                {stay.bedrooms} Bedrooms
              </span>

            </div>

            {/* divider */}
            <div className="my-4 h-px bg-[#e8e5df]" />

            {/* features */}
            <div className="flex flex-wrap gap-2">

              <span className="rounded-full border border-[#e2dfd8] px-2.5 py-1 text-[9px] text-[#66615a]">
                Private Stay
              </span>

              <span className="rounded-full border border-[#e2dfd8] px-2.5 py-1 text-[9px] text-[#66615a]">
                Vrindavan
              </span>

              {stay.bedrooms >= 2 && (
                <span className="rounded-full border border-[#e2dfd8] px-2.5 py-1 text-[9px] text-[#66615a]">
                  Family Friendly
                </span>
              )}

            </div>
          </div>

          {/* description */}
          <p className="mt-4 line-clamp-2 text-[10px] leading-[1.6] text-[#87827a]">
            A comfortable private home in Vrindavan designed for
            families, friends and longer stays.
            <Link
              href={`/stays/${stay.slug}`}
              className="ml-1 text-[#292723] underline underline-offset-2"
            >
              Read more
            </Link>
          </p>

        </div>

        {/* =====================================================
            PRICE
        ===================================================== */}

        <div className="flex flex-col justify-center border-t border-[#e5e2dc] bg-[#fcfbf9] px-5 py-5 lg:border-l lg:border-t-0">

          <div className="text-center lg:text-left">

            <span className="text-[9px] text-[#8a857d]">
              Starting from
            </span>

            <div className="mt-1">

              <span className="text-[23px] font-bold tracking-[-0.02em] text-[#24231f]">
                {inr(stay.basePrice)}
              </span>

            </div>

            <span className="text-[9px] text-[#89847c]">
              per night + taxes
            </span>

          </div>

          <Link
            href={`/stays/${stay.slug}`}
            className="mt-5 flex items-center justify-center gap-2 rounded-md bg-[#171714] px-4 py-3 text-[11px] font-semibold text-white transition-all duration-300 hover:bg-[#3b3932]"
          >
            View stay
            <ArrowUpRight size={14} />
          </Link>

        </div>
      </div>
    </article>
  );
}