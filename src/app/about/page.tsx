import Link from "next/link";
import {
  ArrowRight,
  Heart,
  Home,
  MapPin,
  Users,
  Sparkles,
  Quote,
} from "lucide-react";

import { db } from "@/lib/db";
import Photo from "@/components/site/Photo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "About Us | Vrindavan Holiday Inn",
  description:
    "Discover the story, philosophy and hospitality behind Vrindavan Holiday Inn.",
};

export default async function AboutPage() {
  const stays = await db.stay.findMany({
    where: {
      published: true,
    },
    orderBy: [
      { featured: "desc" },
      { createdAt: "desc" },
    ],
    take: 6,
  });

  const heroImage = stays[0]?.images?.[0];
  const storyImage = stays[1]?.images?.[0] ?? stays[0]?.images?.[1];
  const experienceImage =
    stays[2]?.images?.[0] ??
    stays[1]?.images?.[1] ??
    stays[0]?.images?.[0];

  const galleryImages = [
    stays[0]?.images?.[0],
    stays[1]?.images?.[0],
    stays[2]?.images?.[0],
    stays[3]?.images?.[0],
    stays[4]?.images?.[0],
    stays[5]?.images?.[0],
  ].filter(Boolean);

  return (
    <main className="overflow-hidden bg-[#f7f3ec] text-[#29251f]">

      {/* =========================================================
          HERO
      ========================================================= */}

      <section className="relative min-h-[680px] overflow-hidden lg:min-h-[760px]">

        {/* Image */}
        <div className="absolute inset-0">
          {heroImage ? (
            <Photo
             src="/images/about-us-banner.png"
              alt="Vrindavan Holiday Inn"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[#d9d0c0]" />
          )}

          {/* cinematic overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
        </div>

        {/* Hero content */}
        <div className="relative mx-auto flex min-h-[680px] max-w-[1400px] items-end px-6 pb-16 sm:px-10 lg:min-h-[760px] lg:px-16 lg:pb-24">

          <div className="max-w-3xl text-white">

            <div className="mb-7 flex items-center gap-4">
              <span className="h-px w-12 bg-[#d8b878]" />

              <span className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/80">
                About Vrindavan Holiday Inn
              </span>
            </div>

            <h1 className="max-w-4xl  text-[48px] font-normal leading-[0.98] tracking-[-0.035em] sm:text-[64px] lg:text-[82px]">
              A stay that
              feels like
              <br />
              <span className="italic text-[#e4c58d]">home.</span>
            </h1>

            <p className="mt-7 max-w-xl text-[15px] leading-7 text-white/80 sm:text-base">
              Thoughtful homes, warm hospitality and a genuine connection
              with Vrindavan — created for people who want to experience
              the city at their own pace.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/stays"
                className="group inline-flex items-center gap-3 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-[#29251f] transition-all duration-300 hover:bg-[#e4c58d]"
              >
                Explore our homes
                <ArrowRight
                  size={15}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>

              <a
                href="#our-story"
                className="inline-flex items-center rounded-full border border-white/40 px-6 py-3.5 text-sm text-white backdrop-blur-sm transition hover:bg-white/10"
              >
                Our story
              </a>
            </div>
          </div>
        </div>

        {/* Bottom curve */}
        {/* <div className="absolute bottom-[-1px] left-0 h-14 w-full rounded-t-[50%] bg-[#f7f3ec]" /> */}
      </section>

      {/* =========================================================
          STORY
      ========================================================= */}

      <section
        id="our-story"
        className="mx-auto max-w-[1400px] px-6 py-20 sm:px-10 lg:px-16 lg:py-28"
      >
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-24">

          {/* Text */}
          <div>
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-8 bg-[#b18a4d]" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8d6b38]">
                Our story
              </span>
            </div>

            <h2 className="max-w-lg  text-[42px] font-normal leading-[1.05] tracking-[-0.025em] sm:text-[52px]">
              Hospitality
              should feel {" "}
              <span className="italic text-[#9b7842]">
                personal.
              </span>
            </h2>

            <div className="mt-8 max-w-xl space-y-5 text-[15px] leading-7 text-[#706b63]">
              <p>
                Vrindavan Holiday Inn began with a simple idea: give guests
                the freedom and comfort of a home without losing the care
                of a good host.
              </p>

              <p>
                Every stay is designed around the things that matter when
                you travel together — space to gather, quiet corners,
                thoughtful details and a local team that knows the
                destination.
              </p>

              <p>
                We want your time here to feel less like checking into a
                property and more like arriving somewhere you can settle
                into.
              </p>
            </div>

            <div className="mt-9 flex items-center gap-4">
              <div className="flex -space-x-2">
                <div className="h-9 w-9 rounded-full border-2 border-[#f7f3ec] bg-[#d6c6ad]" />
                <div className="h-9 w-9 rounded-full border-2 border-[#f7f3ec] bg-[#bda98c]" />
                <div className="h-9 w-9 rounded-full border-2 border-[#f7f3ec] bg-[#92806a]" />
              </div>

              <p className="text-xs text-[#777168]">
                A local team, here to make your stay feel effortless.
              </p>
            </div>
          </div>

          {/* Image composition */}
          <div className="relative">

            <div className="relative overflow-hidden rounded-[28px]">
              {storyImage ? (
                <Photo
                  src={storyImage}
                  alt="Inside a Vrindavan Holiday Inn stay"
                  className="aspect-[4/4.5] w-full object-cover transition duration-700 hover:scale-[1.02]"
                />
              ) : (
                <div className="aspect-[4/4.5] bg-[#ded5c7]" />
              )}
            </div>

            {/* Floating card */}
            <div className="absolute -bottom-7 -left-5 max-w-[280px] rounded-2xl border border-[#e5ddd1] bg-[#fbf9f5] p-5 shadow-[0_20px_60px_rgba(60,45,25,0.12)] sm:-left-8">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#eee4d3]">
                <MapPin size={17} className="text-[#8b6936]" />
              </div>

              <h3 className=" text-xl">
                Rooted in Vrindavan
              </h3>

              <p className="mt-2 text-xs leading-5 text-[#777168]">
                Homes close to the places, people and feeling that make
                this city special.
              </p>
            </div>

            {/* small decorative number */}
            <span className="absolute -right-3 -top-7 hidden  text-[90px] leading-none text-[#e8dfd2] lg:block">
              01
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================
          BELIEFS
      ========================================================= */}

      <section className="border-y border-[#e8e0d4] bg-[#eee8dd]">
        <div className="mx-auto max-w-[1400px] px-6 py-20 sm:px-10 lg:px-16 lg:py-24">

          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8d6b38]">
              What we believe
            </span>

            <h2 className="mt-4  text-[40px] font-normal leading-tight tracking-[-0.025em] sm:text-[50px]">
              Simple things,
              <br />
              <span className="italic text-[#9b7842]">
                done thoughtfully.
              </span>
            </h2>

            <div className="mx-auto mt-6 h-px w-10 bg-[#b18a4d]" />
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* Card 1 */}
            <div className="group rounded-[22px] border border-[#e1d9cc] bg-[#f8f5ef] p-7 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(60,45,25,0.08)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eee2ce] transition group-hover:bg-[#e6d2ad]">
                <Home size={21} className="text-[#916d38]" />
              </div>

              <h3 className="mt-6  text-[23px]">
                Feel at home
              </h3>

              <p className="mt-3 text-sm leading-6 text-[#777168]">
                Private spaces with room to live, rest and spend time
                together.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group rounded-[22px] border border-[#e1d9cc] bg-[#f8f5ef] p-7 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(60,45,25,0.08)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f0ded9] transition group-hover:bg-[#ebcbc4]">
                <Heart size={21} className="text-[#a45e50]" />
              </div>

              <h3 className="mt-6  text-[23px]">
                Care comes first
              </h3>

              <p className="mt-3 text-sm leading-6 text-[#777168]">
                Warm local support and attention to the details behind a
                good stay.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group rounded-[22px] border border-[#e1d9cc] bg-[#f8f5ef] p-7 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(60,45,25,0.08)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#dfe8de] transition group-hover:bg-[#d1dfd0]">
                <MapPin size={21} className="text-[#60775d]" />
              </div>

              <h3 className="mt-6  text-[23px]">
                Know the place
              </h3>

              <p className="mt-3 text-sm leading-6 text-[#777168]">
                Vrindavan is part of the experience, not just the
                address.
              </p>
            </div>

            {/* Card 4 */}
            <div className="group rounded-[22px] border border-[#e1d9cc] bg-[#f8f5ef] p-7 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(60,45,25,0.08)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eee2ce] transition group-hover:bg-[#e6d2ad]">
                <Users size={21} className="text-[#916d38]" />
              </div>

              <h3 className="mt-6  text-[23px]">
                Made for people
              </h3>

              <p className="mt-3 text-sm leading-6 text-[#777168]">
                Homes and service designed around families, friends and
                real trips.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================
          EXPERIENCE
      ========================================================= */}

      <section className="mx-auto max-w-[1400px] px-6 py-20 sm:px-10 lg:px-16 lg:py-28">

        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">

          {/* Image */}
          <div className="relative">

            <div className="overflow-hidden rounded-[28px]">
              {experienceImage ? (
                <Photo
                  src={experienceImage}
                  alt="VHI guest experience"
                  className="aspect-[1.15/1] w-full object-cover transition duration-700 hover:scale-[1.02]"
                />
              ) : (
                <div className="aspect-[1.15/1] bg-[#ded5c7]" />
              )}
            </div>

            {/* image label */}
            <div className="absolute bottom-5 left-5 rounded-full border border-white/30 bg-black/30 px-4 py-2 backdrop-blur-md">
              <span className="text-[9px] uppercase tracking-[0.25em] text-white">
                The VHI experience
              </span>
            </div>
          </div>

          {/* Content */}
          <div>

            <div className="flex items-center gap-3">
              <Sparkles size={15} className="text-[#9b7842]" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8d6b38]">
                The VHI experience
              </span>
            </div>

            <h2 className="mt-6  text-[43px] font-normal leading-[1.05] tracking-[-0.025em] sm:text-[54px]">
              More than a
              room for {" "}
              <span className="italic text-[#9b7842]">
                the night.
              </span>
            </h2>

            <div className="mt-7 h-px w-10 bg-[#b18a4d]" />

            <p className="mt-7 max-w-md text-[15px] leading-7 text-[#706b63]">
              From the first message to the moment you leave, our goal is
              to make the practical parts disappear so you can focus on
              being here.
            </p>

            <p className="mt-4 max-w-md text-[15px] leading-7 text-[#706b63]">
              Whether you are here for a few peaceful days, a family
              gathering or a spiritual journey, your stay should feel
              comfortable, easy and distinctly yours.
            </p>

            <Link
              href="/stays"
              className="group mt-8 inline-flex items-center gap-3 rounded-full bg-[#28241e] px-6 py-3.5 text-sm font-medium text-white transition-all duration-300 hover:bg-[#514638]"
            >
              Explore our homes

              <ArrowRight
                size={15}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>

        {/* =====================================================
            STATS
        ===================================================== */}

        <div className="mt-20 grid grid-cols-2 border-y border-[#ded6ca] py-8 sm:grid-cols-4">

          <div className="border-r border-[#ded6ca] px-5 text-center">
            <div className=" text-3xl">
              {stays.length}+
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#817a70]">
              Curated homes
            </p>
          </div>

          <div className="border-r-0 px-5 text-center sm:border-r sm:border-[#ded6ca]">
            <div className=" text-3xl">
              VHI
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#817a70]">
              Vrindavan hospitality
            </p>
          </div>

          <div className="border-r border-[#ded6ca] px-5 pt-7 text-center sm:pt-0">
            <div className=" text-3xl">
              24/7
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#817a70]">
              Guest support
            </p>
          </div>

          <div className="px-5 pt-7 text-center sm:pt-0">
            <div className=" text-3xl">
              01
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#817a70]">
              Destination
            </p>
          </div>

        </div>
      </section>

      {/* =========================================================
          IMAGE STRIP / GALLERY
      ========================================================= */}

      {galleryImages.length > 0 && (
        <section className="pb-20 lg:pb-28">

          <div className="mb-10 px-6 text-center sm:px-10">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8d6b38]">
              A glimpse of VHI
            </span>

            <h2 className="mt-4  text-[38px] sm:text-[46px]">
              Spaces made to be lived in.
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2 px-2 sm:grid-cols-3 lg:grid-cols-6">

            {galleryImages.map((image, index) => (
              <div
                key={`${image}-${index}`}
                className={`group overflow-hidden ${
                  index === 0
                    ? "rounded-l-[24px]"
                    : index === galleryImages.length - 1
                    ? "rounded-r-[24px]"
                    : ""
                }`}
              >
                <Photo
                  src={image}
                  alt={`VHI stay ${index + 1}`}
                  className="aspect-[3/4] w-full object-cover grayscale-[15%] transition duration-700 group-hover:scale-105 group-hover:grayscale-0"
                />
              </div>
            ))}

          </div>
        </section>
      )}

      {/* =========================================================
          FINAL CTA
      ========================================================= */}

      <section className="relative overflow-hidden bg-[#2d2922]">

        <div className="absolute inset-0">
          {heroImage ? (
            <Photo
              src={heroImage}
              alt=""
              className="h-full w-full object-cover opacity-30"
            />
          ) : null}

          {/* <div className="absolute inset-0 bg-[#211e19]/70" /> */}
        </div>

        <div className="relative mx-auto max-w-[1000px] px-6 py-24 text-center sm:px-10 lg:py-32">

          <span className="text-[10px] font-medium uppercase tracking-[0.35em] text-[#dfc28d]">
            Come stay a while
          </span>

          <h2 className="mt-5  text-[48px] font-normal leading-none text-white sm:text-[68px]">
            Vrindavan
            <br />
            <span className="italic text-[#dfc28d]">
              is waiting.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-md text-sm leading-6 text-white/65">
            Find a home that gives you space to slow down, explore and
            experience Vrindavan your way.
          </p>

          <Link
            href="/stays"
            className="group mt-9 inline-flex items-center gap-3 rounded-full bg-white px-7 py-3.5 text-sm font-medium text-[#28241e] transition-all duration-300 hover:bg-[#dfc28d]"
          >
            Find your stay

            <ArrowRight
              size={15}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>

        </div>
      </section>

    </main>
  );
}