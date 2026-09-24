"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Banner = {
  id: string;
  label?: string | null;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  image?: string | null;
  mobileImage?: string | null;
  link?: string | null;
  buttonText?: string | null;
};

export default function HeroSlider({
  banners,
  fallback,
}: {
  banners: Banner[];
  fallback: Banner;
}) {
  const slides = banners.length ? banners : [fallback];

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);

  /*
   * ------------------------------------------------------------
   * PRELOAD ALL SLIDER IMAGES
   * ------------------------------------------------------------
   */

  useEffect(() => {
    slides.forEach((slide) => {
      if (slide.image) {
        const img = new Image();
        img.src = slide.image;
      }

      if (slide.mobileImage) {
        const img = new Image();
        img.src = slide.mobileImage;
      }
    });
  }, [slides]);

  /*
   * ------------------------------------------------------------
   * AUTO SLIDE
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (slides.length <= 1 || paused) return;

    const timer = window.setInterval(() => {
      changeSlide((index + 1) % slides.length);
    }, 5500);

    return () => {
      window.clearInterval(timer);
    };
  }, [index, paused, slides.length]);

  /*
   * ------------------------------------------------------------
   * CHANGE SLIDE
   * ------------------------------------------------------------
   */

  const changeSlide = (nextIndex: number) => {
    if (nextIndex === index) return;

    // Fade text out first
    setContentVisible(false);

    // Change image shortly after
    window.setTimeout(() => {
      setIndex(nextIndex);

      // Bring content back in
      window.setTimeout(() => {
        setContentVisible(true);
      }, 180);
    }, 180);
  };

  const next = () => {
    changeSlide((index + 1) % slides.length);
  };

  const prev = () => {
    changeSlide(
      (index - 1 + slides.length) % slides.length
    );
  };

  const slide = slides[index] ?? slides[0];

  return (
    <section
      className="relative isolate overflow-hidden bg-[#1d2724]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >

      {/* =====================================================
          BACKGROUND SLIDES
          CROSS FADE
      ===================================================== */}

      <div className="absolute inset-0">

        {slides.map((item, i) => {
          const isActive = i === index;

          return (
            <div
              key={item.id}
              className={`
                absolute
                inset-0
                transition-opacity
                duration-[1200ms]
                ease-in-out
                ${
                  isActive
                    ? "z-[1] opacity-100"
                    : "z-0 opacity-0"
                }
              `}
            >

              <picture>
                {item.mobileImage && (
                  <source
                    media="(max-width: 640px)"
                    srcSet={item.mobileImage}
                  />
                )}

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image || ""}
                  alt=""
                  aria-hidden="true"
                  className="
                    h-full
                    w-full
                    object-cover
                  "
                />
              </picture>

            </div>
          );
        })}

        {/* dark cinematic overlay */}
        <div className="absolute inset-0 z-[2] bg-black/25" />

        {/* left gradient for text readability */}
        <div className="absolute inset-0 z-[3] bg-gradient-to-r from-black/65 via-black/30 to-transparent" />

        {/* bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 z-[3] h-48 bg-gradient-to-t from-black/45 to-transparent" />

      </div>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="home-shell relative z-10 flex min-h-[570px] items-end pb-24 pt-20 sm:min-h-[640px] sm:pb-28">

        <div
          className={`
            max-w-2xl
            text-white
            transition-all
            duration-500
            ease-out
            ${
              contentVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-2 opacity-0"
            }
          `}
        >

          {/* label */}
          <span className="home-eyebrow home-eyebrow-light">
            {slide.label ?? "VHI VRINDAVAN"}
          </span>

          {/* title */}
          <h1 className="mt-4 max-w-3xl text-5xl leading-[0.94] tracking-tight sm:text-6xl lg:text-7xl">
            {slide.title}
          </h1>

          {/* subtitle */}
          {slide.subtitle && (
            <p className="mt-5 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
              {slide.subtitle}
            </p>
          )}

          {/* button */}
          {slide.link && (
            <Link
              href={slide.link}
              className="btn btn-light mt-7 inline-flex"
            >
              {slide.buttonText || "Explore homes"}
              <ArrowRight size={15} />
            </Link>
          )}

        </div>
      </div>

      {/* =====================================================
          CONTROLS
      ===================================================== */}

      {slides.length > 1 && (
        <div className="absolute bottom-7 right-5 z-20 flex items-center gap-2 sm:bottom-8 sm:right-8">

          {/* previous */}
          <button
            type="button"
            onClick={prev}
            aria-label="Previous banner"
            className="
              flex
              size-9
              items-center
              justify-center
              rounded-full
              border
              border-white/30
              bg-black/15
              text-white
              backdrop-blur-md
              transition
              hover:border-white/60
              hover:bg-white/15
            "
          >
            <ChevronLeft size={17} />
          </button>

          {/* dots */}
          <div
            className="
              flex
              items-center
              gap-1.5
              rounded-full
              border
              border-white/20
              bg-black/15
              px-3
              py-2.5
              backdrop-blur-md
            "
            aria-label="Banner slides"
          >
            {slides.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => changeSlide(i)}
                aria-label={`Go to banner ${i + 1}`}
                className={`
                  h-1.5
                  rounded-full
                  transition-all
                  duration-500
                  ${
                    i === index
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/45 hover:bg-white/75"
                  }
                `}
              />
            ))}
          </div>

          {/* next */}
          <button
            type="button"
            onClick={next}
            aria-label="Next banner"
            className="
              flex
              size-9
              items-center
              justify-center
              rounded-full
              border
              border-white/30
              bg-black/15
              text-white
              backdrop-blur-md
              transition
              hover:border-white/60
              hover:bg-white/15
            "
          >
            <ChevronRight size={17} />
          </button>

        </div>
      )}

      {/* =====================================================
          PROGRESS BAR
      ===================================================== */}

      {slides.length > 1 && !paused && (
        <div className="absolute bottom-0 left-0 z-20 h-[2px] w-full overflow-hidden bg-white/10">
          <div
            key={index}
            className="
              h-full
              origin-left
              bg-white/75
              animate-[heroProgress_5.5s_linear_forwards]
            "
          />
        </div>
      )}

    </section>
  );
}