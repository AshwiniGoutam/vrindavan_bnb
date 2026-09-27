"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { MediaRef } from "@/lib/media";
import { imageSrcSet, transformUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { HeroSearch, type HeroTour } from "./hero-search";

export interface HeroSlide {
  id: string;
  eyebrow?: string;
  title: string;
  titleAccent?: string;
  subtitle?: string;
  textTone?: "dark" | "light";
  image?: MediaRef;
  mobileImage?: MediaRef;
  video?: MediaRef;
  ctaLabel?: string;
  ctaHref?: string;
}

const INTERVAL = 6500;

/** Announces the active slide's text tone so the transparent header can switch logo/text colour. */
const announceTone = (tone: "dark" | "light") => {
  window.dispatchEvent(new CustomEvent("vhi:hero-tone", { detail: tone }));
};

function SlideImage({ slide, active, priority }: { slide: HeroSlide; active: boolean; priority: boolean }) {
  const desktop = slide.image;
  const mobile = slide.mobileImage ?? slide.image;
  if (!desktop?.url && !slide.video?.url) return <div className="photo-fallback absolute inset-0" />;
  return (
    <>
      {desktop?.url ? (
        <picture>
          {mobile?.url && mobile.url !== desktop.url ? (
            <source media="(max-width: 767px)" srcSet={imageSrcSet(mobile.url, [480, 768, 1080], "c_fill,g_auto,ar_4:5") || mobile.url} sizes="100vw" />
          ) : null}
          <img
            src={transformUrl(desktop.url, "f_auto,q_auto,w_1920,c_fill,g_auto")}
            srcSet={imageSrcSet(desktop.url, [768, 1080, 1440, 1920, 2560]) || undefined}
            sizes="100vw"
            alt={desktop.alt || slide.title}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            className={cn("absolute inset-0 h-full w-full object-cover object-[70%_center] transition-transform duration-[7000ms] ease-out", active ? "scale-105" : "scale-100")}
          />
        </picture>
      ) : null}
      {slide.video?.url && active ? (
        <video
          className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
          src={transformUrl(slide.video.url, "q_auto,vc_auto,w_1920")}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        />
      ) : null}
    </>
  );
}

interface HeroSliderProps {
  slides: HeroSlide[];
  /** Darshan journeys for the homepage search tab */
  tours?: HeroTour[];
  whatsapp?: string;
  /** "home" = full-height homepage hero; "page" = shorter banner for listing pages */
  variant?: "home" | "page";
  /** Rendered above the headline (e.g. breadcrumbs) */
  top?: ReactNode;
  /** Replaces the default Stays/Darshan search bar (e.g. the stays filters) */
  children?: ReactNode;
}

/**
 * Admin-managed banners as an auto-playing crossfade slider.
 * Homepage: Stays / Darshan search bar at the bottom. Listing pages: pass their own filters as children.
 */
export function HeroSlider({ slides, tours = [], whatsapp, variant = "home", top, children }: HeroSliderProps) {
  const isPage = variant === "page";
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;
  const current = slides[index] ?? slides[0];
  const tone = current?.textTone ?? "dark";
  const dark = tone === "dark";

  const go = useCallback((d: number) => setIndex((i) => (i + d + count) % count), [count]);

  useEffect(() => {
    announceTone(tone);
  }, [tone]);
   useEffect(() => {
    return () => announceTone("light");
  }, []);

  useEffect(() => {
    if (count < 2 || paused || userPaused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go(1), INTERVAL);
    return () => clearTimeout(t);
  }, [index, count, paused, userPaused, go]);

  if (!current) return null;

  return (
    <section
      className="relative isolate overflow-hidden bg-linen"
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      {/* Slides (crossfade) */}
      <div className="absolute inset-0 -z-10">
        {slides.map((s, i) => (
          <div key={s.id} className={cn("absolute inset-0 transition-opacity duration-[1200ms] ease-out", i === index ? "opacity-100" : "opacity-0")} aria-hidden={i !== index}>
            <SlideImage slide={s} active={i === index} priority={i === 0} />
            {/* Readability wash: ivory from the left for dark text, ink for white text */}
            <div
              className={cn(
                "absolute inset-0",
                (s.textTone ?? "dark") === "dark"
                  ? "bg-gradient-to-b from-ivory/90 via-ivory/60 to-ivory/10 md:bg-gradient-to-r md:from-ivory/90 md:via-ivory/45 md:to-transparent"
                  : "bg-gradient-to-b from-ink/70 via-ink/40 to-ink/30 md:bg-gradient-to-r md:from-ink/75 md:via-ink/35 md:to-transparent",
              )}
            />
          </div>
        ))}
      </div>

      <div className={cn("container-x flex flex-col justify-end pb-6 pt-28 md:pb-10 md:pt-36", isPage ? "min-h-[80svh] md:min-h-[74svh]" : "min-h-[100svh] md:min-h-[92svh]")}>
        {top ? <div className={cn("mb-8", dark ? "text-muted" : "text-sand")}>{top}</div> : null}
        {/* Copy */}
        <div key={current.id} className={cn("max-w-2xl", dark ? "text-ink" : "text-ivory")} aria-live="polite">
          {current.eyebrow ? (
            <p className={cn("eyebrow", dark ? "text-umber" : "text-sand")} style={{ animation: "heroIn .9s .05s both" }}>
              {current.eyebrow}
            </p>
          ) : null}
          <h1 className={cn("display mt-5 leading-[1.02]", isPage ? "text-[2.6rem] sm:text-5xl lg:text-[4.4rem]" : "text-[2.9rem] sm:text-6xl lg:text-[4rem]")} style={{ animation: "heroIn 1s .12s both" }}>
            {current.title}
            {current.titleAccent ? <span className="accent block">{current.titleAccent}</span> : null}
          </h1>
          {current.subtitle ? (
            <p className={cn("mt-6 max-w-md text-base leading-relaxed md:text-[1.05rem]", dark ? "text-charcoal/80" : "text-sand")} style={{ animation: "heroIn 1s .22s both" }}>
              {current.subtitle}
            </p>
          ) : null}
          {current.ctaLabel && current.ctaHref ? (
            <Link href={current.ctaHref} className={cn("btn mt-8", dark ? "btn-outline" : "btn-ghost-light")} style={{ animation: "heroIn 1s .3s both" }}>
              {current.ctaLabel} <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          ) : null}
        </div>

        {/* Controls */}
        {count > 1 ? (
          <div className={cn("mt-10 flex items-center gap-4 md:mt-12", dark ? "text-ink" : "text-ivory")}>
            <div className="flex items-center gap-2" role="tablist" aria-label="Choose slide">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Slide ${i + 1}: ${s.title}`}
                  onClick={() => setIndex(i)}
                  className="group relative h-6 w-10"
                >
                  <span className={cn("absolute inset-x-0 top-1/2 h-px -translate-y-1/2", dark ? "bg-ink/25" : "bg-ivory/35")} />
                  <span
                    className={cn("absolute left-0 top-1/2 h-px -translate-y-1/2", dark ? "bg-ink" : "bg-ivory", i === index ? "w-full" : "w-0")}
                    style={i === index && !paused && !userPaused ? { animation: `heroProgress ${INTERVAL}ms linear both` } : undefined}
                  />
                </button>
              ))}
            </div>
            <span className="font-mono text-[0.68rem] tracking-[0.2em]">
              {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {/* <button type="button" onClick={() => setUserPaused((p) => !p)} aria-label={userPaused ? "Play slideshow" : "Pause slideshow"} className={cn("flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-sm transition", dark ? "border-ink/25 bg-ivory/50 hover:bg-ivory" : "border-ivory/40 bg-ink/20 hover:bg-ink/40")}>
                {userPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button> */}
              <button type="button" onClick={() => go(-1)} aria-label="Previous slide" className={cn("flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-sm transition", dark ? "border-ink/25 bg-ivory/50 hover:bg-ivory" : "border-ivory/40 bg-ink/20 hover:bg-ink/40")}>
                <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next slide" className={cn("flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-sm transition", dark ? "border-ink/25 bg-ivory/50 hover:bg-ivory" : "border-ivory/40 bg-ink/20 hover:bg-ink/40")}>
                <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        ) : null}

        {/* Search */}
        <div className="mt-6 md:mt-8" style={{ animation: "heroIn 1s .35s both" }}>
          {children ?? <HeroSearch tours={tours} whatsapp={whatsapp} />}
        </div>
      </div>

      <style>{`@keyframes heroIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}@keyframes heroProgress{from{width:0}to{width:100%}}`}</style>
    </section>
  );
}