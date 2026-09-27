"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Grid2x2, X } from "lucide-react";
import type { MediaRef } from "@/lib/media";
import { imageSrcSet, transformUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { Photo } from "./photo";

export interface TourRoom {
  name: string;
  highlights?: string[];
}

const ADDITIONAL = "Additional photos";

/** Group photos by room: admin room order first, then any other tags, then untagged → "Additional photos". */
function groupPhotos(images: MediaRef[], tour: TourRoom[]) {
  const byName = new Map<string, MediaRef[]>();
  for (const img of images) {
    const key = img.group?.trim() || ADDITIONAL;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(img);
  }
  const order = [...tour.map((r) => r.name), ...Array.from(byName.keys()).filter((k) => k !== ADDITIONAL && !tour.some((r) => r.name === k)), ADDITIONAL];
  return order
    .filter((name, i) => byName.has(name) && order.indexOf(name) === i)
    .map((name) => ({ name, highlights: tour.find((r) => r.name === name)?.highlights ?? [], images: byName.get(name)! }));
}

/** Editorial mosaic + Airbnb-style "Photo tour" (photos grouped by room) + full-screen lightbox. */
export function Gallery({ images, title, tour = [] }: { images: MediaRef[]; title: string; tour?: TourRoom[] }) {
  const groups = useMemo(() => groupPhotos(images, tour), [images, tour]);
  const ordered = useMemo(() => groups.flatMap((g) => g.images), [groups]);
  const [tourOpen, setTourOpen] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const tourRef = useRef<HTMLDivElement>(null);
  const count = ordered.length;
  const go = useCallback((d: number) => setOpen((i) => (i === null ? null : (i + d + count) % count)), [count]);
  const indexOf = (m: MediaRef) => Math.max(0, ordered.indexOf(m));

  useEffect(() => {
    if (open === null && !tourOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (open !== null) setOpen(null);
        else setTourOpen(false);
      }
      if (open !== null && e.key === "ArrowRight") go(1);
      if (open !== null && e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, tourOpen, go]);

  if (!images.length) return <Photo className="aspect-[16/9] md:aspect-[21/9]" label={title} />;
  const main = images[0];
  const rest = images.slice(1, 5);
  const scrollToRoom = (name: string) => tourRef.current?.querySelector<HTMLElement>(`[data-room="${CSS.escape(name)}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      {/* Mosaic */}
      <div className="relative grid gap-2 md:grid-cols-4 md:grid-rows-2">
        <button type="button" onClick={() => setTourOpen(true)} className="img-zoom md:col-span-2 md:row-span-2" aria-label="Open photo tour">
          <Photo media={main} alt={main.alt || title} className="aspect-[4/3] h-full md:aspect-auto md:min-h-[520px]" sizes="(min-width:768px) 50vw, 100vw" priority />
        </button>
        {rest.map((m, i) => (
          <button key={i} type="button" onClick={() => setTourOpen(true)} className="img-zoom hidden md:block" aria-label={`Open photo ${i + 2}`}>
            <Photo media={m} alt={m.alt || title} className="h-full min-h-[256px]" sizes="25vw" />
          </button>
        ))}
        {count > 1 ? (
          <button type="button" onClick={() => setTourOpen(true)} className="absolute bottom-4 right-4 flex items-center gap-2 bg-ivory px-4 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-ink shadow">
            <Grid2x2 className="h-4 w-4" strokeWidth={1.4} /> Show all {count} photos
          </button>
        ) : null}
      </div>

      {/* Photo tour */}
      {tourOpen ? (
        <div ref={tourRef} className="fixed inset-0 z-[75] overflow-y-auto bg-ivory" role="dialog" aria-modal="true" aria-label={`${title} photo tour`}>
          <div className="sticky top-0 z-10 flex items-center justify-between border-b hairline bg-ivory/95 px-4 py-3 backdrop-blur md:px-8">
            <button type="button" onClick={() => setTourOpen(false)} className="flex items-center gap-2 text-sm" aria-label="Close photo tour">
              <ArrowLeft className="h-5 w-5" strokeWidth={1.4} /> <span className="hidden sm:inline">{title}</span>
            </button>
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">{count} photos</span>
          </div>

          <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 md:px-8">
            <h2 className="display text-3xl text-ink md:text-4xl">Photo tour</h2>

            {/* Room thumbnails */}
            {groups.length > 1 ? (
              <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-5 lg:grid-cols-7">
                {groups.map((g) => (
                  <button key={g.name} type="button" onClick={() => scrollToRoom(g.name)} className="group text-left">
                    <Photo media={g.images[0]} alt={g.name} className="aspect-[4/3]" imgClassName="transition duration-500 group-hover:opacity-85" sizes="160px" />
                    <span className="mt-2 block text-xs text-charcoal">{g.name}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {/* Rooms */}
            <div className="mt-14 space-y-16">
              {groups.map((g) => (
                <section key={g.name} data-room={g.name} className="grid scroll-mt-20 gap-5 md:grid-cols-[240px_1fr] md:gap-10">
                  <div className="md:sticky md:top-20 md:self-start">
                    <h3 className="display text-2xl text-ink">{g.name}</h3>
                    {g.highlights.length ? <p className="mt-2 text-sm leading-relaxed text-muted">{g.highlights.join(" · ")}</p> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {g.images.map((m, i) => {
                      // Rhythm: large, two small, large… (a trailing single small photo goes full width)
                      const big = i % 3 === 0 || (i === g.images.length - 1 && i % 3 === 1);
                      return (
                        <button key={`${m.url}${i}`} type="button" onClick={() => setOpen(indexOf(m))} className={cn("img-zoom block", big && "col-span-2")} aria-label={`Open ${g.name} photo ${i + 1}`}>
                          <Photo media={m} alt={m.alt || `${title} — ${g.name}`} className={big ? "aspect-[3/2]" : "aspect-[4/3]"} sizes={big ? "(min-width:768px) 700px, 100vw" : "(min-width:768px) 350px, 50vw"} />
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Lightbox */}
      {open !== null && ordered[open] ? (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-ink text-ivory"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} photos`}
          onTouchStart={(e) => ((e.currentTarget as HTMLElement).dataset.x = String(e.touches[0].clientX))}
          onTouchEnd={(e) => {
            const x0 = Number((e.currentTarget as HTMLElement).dataset.x ?? 0);
            const dx = e.changedTouches[0].clientX - x0;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          }}
        >
          <div className="flex items-center justify-between p-4 md:p-6">
            <span className="font-mono text-xs tracking-[0.2em]">
              {open + 1} / {count}
              {ordered[open].group ? <span className="ml-3 text-sand">{ordered[open].group}</span> : null}
            </span>
            <button type="button" onClick={() => setOpen(null)} aria-label="Close"><X className="h-6 w-6" strokeWidth={1.3} /></button>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-4 pb-10 md:px-20">
            {ordered[open].resourceType === "video" ? (
              <video src={ordered[open].url} controls autoPlay className="max-h-full max-w-full" />
            ) : (
              <img src={transformUrl(ordered[open].url, "f_auto,q_auto,w_2000")} srcSet={imageSrcSet(ordered[open].url, [800, 1400, 2000], "c_limit") || undefined} sizes="100vw" alt={ordered[open].alt || title} className="max-h-full max-w-full object-contain" />
            )}
            <button type="button" onClick={() => go(-1)} className="absolute left-2 hidden p-3 md:block" aria-label="Previous"><ChevronLeft className="h-8 w-8" strokeWidth={1} /></button>
            <button type="button" onClick={() => go(1)} className="absolute right-2 hidden p-3 md:block" aria-label="Next"><ChevronRight className="h-8 w-8" strokeWidth={1} /></button>
          </div>
          {ordered[open].caption ? <p className="pb-6 text-center text-sm text-sand">{ordered[open].caption}</p> : null}
        </div>
      ) : null}
    </>
  );
}
