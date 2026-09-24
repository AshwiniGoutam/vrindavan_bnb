import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Minus,
  Plus,
  SlidersHorizontal,
} from "lucide-react";

import { db } from "@/lib/db";
import SearchBar from "@/components/home/SearchBar";
import StayCard from "@/components/home/StayCard";
import { getCollections, getDestinations } from "@/lib/content";
import { unavailableStayIds } from "@/lib/availability";
import { isISODate, nightsBetween } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Vrindavan Stays",
};

type SP = {
  city?: string;
  collection?: string;
  guests?: string;
  checkIn?: string;
  checkOut?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  rooms?: string;
};

export default async function StaysPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const guests = Math.max(
    1,
    parseInt(sp.guests ?? "1", 10) || 1
  );

  const minPrice = Math.max(
    0,
    parseInt(sp.minPrice ?? "0", 10) || 0
  );

  const maxPrice = Math.max(
    minPrice,
    parseInt(sp.maxPrice ?? "0", 10) || 0
  );

  const rooms = Math.max(
    0,
    parseInt(sp.rooms ?? "0", 10) || 0
  );

  const hasDates =
    isISODate(sp.checkIn) &&
    isISODate(sp.checkOut) &&
    nightsBetween(sp.checkIn!, sp.checkOut!) > 0;

  const where: Record<string, any> = {
    published: true,
    maxGuests: {
      gte: guests,
    },
  };

  /*
   * CITY SEARCH
   */
  if (sp.city) {
    where.OR = [
      {
        city: {
          contains: sp.city,
          mode: "insensitive",
        },
      },
      {
        title: {
          contains: sp.city,
          mode: "insensitive",
        },
      },
      {
        state: {
          contains: sp.city,
          mode: "insensitive",
        },
      },
    ];
  }

  /*
   * COLLECTION
   */
  if (sp.collection) {
    where.collections = {
      has: sp.collection,
    };
  }

  /*
   * PRICE
   */
  if (minPrice > 0 || maxPrice > 0) {
    where.basePrice = {};

    if (minPrice > 0) {
      where.basePrice.gte = minPrice;
    }

    if (maxPrice > 0) {
      where.basePrice.lte = maxPrice;
    }
  }

  /*
   * BEDROOMS
   */
  if (rooms > 0) {
    where.bedrooms = {
      gte: rooms,
    };
  }

  /*
   * AVAILABILITY
   */
  if (hasDates) {
    where.id = {
      notIn: await unavailableStayIds(
        sp.checkIn!,
        sp.checkOut!
      ),
    };
  }

  /*
   * SORT
   */
  let orderBy: Record<string, any>;

  switch (sp.sort) {
    case "price-asc":
      orderBy = {
        basePrice: "asc",
      };
      break;

    case "price-desc":
      orderBy = {
        basePrice: "desc",
      };
      break;

    case "rating":
      orderBy = {
        rating: "desc",
      };
      break;

    default:
      orderBy = {
        featured: "desc",
      };
  }

  const [
    stays,
    cities,
    collectionList,
    destinations,
  ] = await Promise.all([
    db.stay.findMany({
      where,
      orderBy,
    }),

    db.stay.findMany({
      where: {
        published: true,
      },
      distinct: ["city"],
      select: {
        city: true,
      },
    }),

    getCollections(),
    getDestinations(),
  ]);

  /*
   * PRESERVE EXISTING QUERY PARAMS
   */
  const link = (patch: Partial<SP>) => {
    const p = new URLSearchParams();

    const values = {
      ...sp,
      ...patch,
    };

    Object.entries(values).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        p.set(key, String(value));
      }
    });

    return `/stays?${p.toString()}`;
  };

  const activeCollection = collectionList.find(
    (c: any) => c.slug === sp.collection
  );

  const allCities = [
    ...new Set([
      ...cities.map((c) => c.city),
      ...destinations,
    ]),
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-[#f8f7f4]">

      {/* =====================================================
          SEARCH AREA
      ===================================================== */}

      {/* <div className="border-b border-[#e5e2dc] bg-white">
        <div className="home-shell py-6 sm:py-7">
          <SearchBar
            cities={allCities}
            initial={{
              city: sp.city,
              checkIn: hasDates
                ? sp.checkIn
                : undefined,
              checkOut: hasDates
                ? sp.checkOut
                : undefined,
              guests,
            }}
          />
        </div>
      </div> */}

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="mx-auto max-w-[1380px] px-5 py-6 sm:px-8 lg:px-10 lg:py-8">

        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-[12px] text-[#77736d]">
          <Link
            href="/"
            className="hover:text-[#222]"
          >
            Home
          </Link>

          <span>/</span>

          <span className="text-[#292723]">
            Vrindavan Stays
          </span>
        </div>

        {/* Mobile filters */}
        <div className="mb-5 lg:hidden">
          <details className="group overflow-hidden rounded-xl border border-[#dedbd5] bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-medium">
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={16} />
                Filters
              </span>

              <ChevronDown
                size={16}
                className="transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="border-t border-[#e7e4df] p-4">
              <FilterContent
                sp={sp}
                link={link}
                allCities={allCities}
                minPrice={minPrice}
                maxPrice={maxPrice}
                rooms={rooms}
              />
            </div>
          </details>
        </div>

        <div className="grid gap-7 lg:grid-cols-[250px_minmax(0,1fr)]">

          {/* =================================================
              SIDEBAR
          ================================================= */}

          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <div className="rounded-xl border border-[#ccc9] bg-white">

                <div className="border-b border-[#e7e4df] px-5 py-5">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal
                      size={16}
                      className="text-[#333]"
                    />

                    <h2 className="text-[15px] font-semibold">
                      Filters
                    </h2>
                  </div>
                </div>

                <FilterContent
                  sp={sp}
                  link={link}
                  allCities={allCities}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  rooms={rooms}
                />
              </div>
            </div>
          </aside>

          {/* =================================================
              LISTING AREA
          ================================================= */}

          <section className="min-w-0">

            {/* top heading */}
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b6d3c]">
                  {activeCollection?.title ??
                    "VRINDAVAN STAYS"}
                </span>

                <h1 className="mt-1 text-[24px] font-medium tracking-[-0.02em] text-[#25231f] sm:text-[27px]">
                  {sp.city
                    ? `Homes in ${sp.city}`
                    : "Private homes in Vrindavan"}
                </h1>

                <p className="mt-1 text-[12px] text-[#858079]">
                  {stays.length}{" "}
                  {stays.length === 1
                    ? "home"
                    : "homes"}{" "}
                  {hasDates
                    ? "available on your dates"
                    : "to explore"}
                </p>
              </div>

              {/* SORT */}
              <div className="flex items-center gap-2">

                <span className="hidden text-[11px] text-[#77736d] sm:block">
                  Sort by
                </span>

                <div className="flex overflow-hidden rounded-lg border border-[#d9d6d0] bg-white">

                  <Link
                    href={link({
                      sort: "",
                    })}
                    className={`px-3 py-2 text-[11px] ${
                      !sp.sort
                        ? "bg-[#292723] text-white"
                        : "text-[#555]"
                    }`}
                  >
                    Recommended
                  </Link>

                  <Link
                    href={link({
                      sort: "price-asc",
                    })}
                    className={`border-l border-[#dedbd5] px-3 py-2 text-[11px] ${
                      sp.sort === "price-asc"
                        ? "bg-[#292723] text-white"
                        : "text-[#555]"
                    }`}
                  >
                    Price low
                  </Link>

                  <Link
                    href={link({
                      sort: "price-desc",
                    })}
                    className={`hidden border-l border-[#dedbd5] px-3 py-2 text-[11px] sm:block ${
                      sp.sort === "price-desc"
                        ? "bg-[#292723] text-white"
                        : "text-[#555]"
                    }`}
                  >
                    Price high
                  </Link>

                  <Link
                    href={link({
                      sort: "rating",
                    })}
                    className={`border-l border-[#dedbd5] px-3 py-2 text-[11px] ${
                      sp.sort === "rating"
                        ? "bg-[#292723] text-white"
                        : "text-[#555]"
                    }`}
                  >
                    Rating
                  </Link>
                </div>
              </div>
            </div>

            {/* collection pills */}
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1">

              <Link
                href={link({
                  collection: "",
                })}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-medium ${
                  !sp.collection
                    ? "border-[#292723] bg-[#292723] text-white"
                    : "border-[#ddd9d2] bg-white text-[#555]"
                }`}
              >
                Everything
              </Link>

              {collectionList.map((collection: any) => (
                <Link
                  key={collection.slug}
                  href={link({
                    collection: collection.slug,
                  })}
                  className={`shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-medium ${
                    sp.collection === collection.slug
                      ? "border-[#292723] bg-[#292723] text-white"
                      : "border-[#ddd9d2] bg-white text-[#555]"
                  }`}
                >
                  {collection.title}
                </Link>
              ))}
            </div>

            {/* listings */}
            {stays.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#d8d4cc] bg-white px-6 py-16 text-center">

                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#f0eee9]">
                  <MapPin
                    size={20}
                    className="text-[#8a8379]"
                  />
                </div>

                <h3 className="mt-4 text-lg font-medium">
                  No homes found
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm text-[#77736d]">
                  Try changing your dates, guests or filters
                  to see more Vrindavan homes.
                </p>

                <Link
                  href="/stays"
                  className="mt-5 inline-flex rounded-full bg-[#292723] px-5 py-2.5 text-xs font-medium text-white"
                >
                  Clear filters
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {stays.map((stay: any) => (
                  <StayCard
                    key={stay.id}
                    stay={stay}
                  />
                ))}
              </div>
            )}

          </section>
        </div>
      </div>
    </main>
  );
}


/* =============================================================
   FILTER CONTENT
   ============================================================= */

function FilterContent({
  sp,
  link,
  allCities,
  minPrice,
  maxPrice,
  rooms,
}: {
  sp: SP;
  link: (patch: Partial<SP>) => string;
  allCities: string[];
  minPrice: number;
  maxPrice: number;
  rooms: number;
}) {
  return (
    <div>

      {/* PRICE */}
      <div className="border-b border-[#e7e4df] px-5 py-5">

        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-medium">
            Price range
          </h3>

          <span className="text-[10px] text-[#99938a]">
            ₹ / night
          </span>
        </div>

        <div className="mt-5">

          <div className="relative h-1 rounded-full bg-[#dedbd5]">
            <div className="absolute left-0 right-[20%] h-1 rounded-full bg-[#25231f]" />

            <span className="absolute left-0 top-1/2 size-4 -translate-y-1/2 rounded-full border border-[#ddd9d2] bg-white shadow-sm" />

            <span className="absolute right-[20%] top-1/2 size-4 -translate-y-1/2 rounded-full border border-[#ddd9d2] bg-white shadow-sm" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">

            <Link
              href={link({
                minPrice: "1000",
              })}
              className={`rounded-lg border px-3 py-2.5 text-[11px] ${
                minPrice === 1000
                  ? "border-[#292723] bg-[#faf9f7]"
                  : "border-[#ddd9d2] bg-white"
              }`}
            >
              ₹1,000
            </Link>

            <Link
              href={link({
                maxPrice: "50000",
              })}
              className={`rounded-lg border px-3 py-2.5 text-[11px] ${
                maxPrice === 50000
                  ? "border-[#292723] bg-[#faf9f7]"
                  : "border-[#ddd9d2] bg-white"
              }`}
            >
              ₹50,000
            </Link>

          </div>

          {(minPrice > 0 || maxPrice > 0) && (
            <Link
              href={link({
                minPrice: "",
                maxPrice: "",
              })}
              className="mt-2 block rounded-lg border border-[#292723] py-2 text-center text-[11px] font-medium"
            >
              Clear price
            </Link>
          )}
        </div>
      </div>

      {/* ROOMS */}
      <div className="border-b border-[#e7e4df] px-5 py-5">

        <h3 className="text-[14px] font-medium">
          Rooms
        </h3>

        <div className="mt-4 flex items-center justify-between">

          <span className="text-[12px] text-[#77736d]">
            No. of bedrooms
          </span>

          <div className="flex items-center overflow-hidden rounded-lg border border-[#ddd9d2]">

            <Link
              href={link({
                rooms: String(
                  Math.max(0, rooms - 1)
                ),
              })}
              className="flex size-8 items-center justify-center bg-white hover:bg-[#f5f3ef]"
            >
              <Minus size={13} />
            </Link>

            <span className="flex h-8 min-w-8 items-center justify-center border-x border-[#ddd9d2] bg-[#faf9f7] text-[11px]">
              {rooms || "Any"}
            </span>

            <Link
              href={link({
                rooms: String(rooms + 1),
              })}
              className="flex size-8 items-center justify-center bg-white hover:bg-[#f5f3ef]"
            >
              <Plus size={13} />
            </Link>

          </div>
        </div>
      </div>

      {/* CITY */}
      <div className="border-b border-[#e7e4df] px-5 py-5">

        <h3 className="text-[14px] font-medium">
          City
        </h3>

        <div className="mt-4 space-y-3">

          <Link
            href={link({
              city: "",
            })}
            className="flex items-center gap-2 text-[12px]"
          >
            <span
              className={`flex size-4 items-center justify-center rounded-full border ${
                !sp.city
                  ? "border-[#292723]"
                  : "border-[#bbb7b0]"
              }`}
            >
              {!sp.city && (
                <span className="size-2 rounded-full bg-[#292723]" />
              )}
            </span>

            All
          </Link>

          {allCities.slice(0, 8).map((city) => (
            <Link
              key={city}
              href={link({
                city,
              })}
              className="flex items-center gap-2 text-[12px]"
            >
              <span
                className={`flex size-4 items-center justify-center rounded-full border ${
                  sp.city === city
                    ? "border-[#292723]"
                    : "border-[#bbb7b0]"
                }`}
              >
                {sp.city === city && (
                  <span className="size-2 rounded-full bg-[#292723]" />
                )}
              </span>

              {city}
            </Link>
          ))}

        </div>
      </div>

      {/* GUESTS */}
      <div className="px-5 py-5">

        <h3 className="text-[14px] font-medium">
          Guests
        </h3>

        <p className="mt-2 text-[11px] leading-5 text-[#8b857d]">
          Showing homes that can accommodate at
          least {sp.guests || 1} guest
          {Number(sp.guests || 1) > 1 ? "s" : ""}.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">

          {[1, 2, 4, 6, 8].map((count) => (
            <Link
              key={count}
              href={link({
                guests: String(count),
              })}
              className={`rounded-full border px-3 py-1.5 text-[10px] ${
                Number(sp.guests || 1) === count
                  ? "border-[#292723] bg-[#292723] text-white"
                  : "border-[#ddd9d2] bg-white text-[#555]"
              }`}
            >
              {count}+
            </Link>
          ))}

        </div>
      </div>

    </div>
  );
}