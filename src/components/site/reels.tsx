"use client";

import { useState } from "react";
import { Play, X, Instagram } from "lucide-react";
import type { MediaRef } from "@/lib/media";
import { transformUrl, videoPoster } from "@/lib/media";
import { Photo } from "./photo";

interface Reel {
  _id: string;
  title?: string;
  label?: string;
  instagramUrl?: string;
  thumbnail?: MediaRef;
  video?: MediaRef;
}

/** Vertical reel strip: plays Cloudinary videos in a lightbox, or opens Instagram. */
export function Reels({ reels, instagram }: { reels: Reel[]; instagram?: string }) {
  const [playing, setPlaying] = useState<Reel | null>(null);
  return (
    <section className="section overflow-hidden bg-ink text-ivory">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow text-sand">From our guests & hosts</p>
            <h2 className="display mt-5 text-4xl md:text-6xl">Vrindavan, <span className="accent text-sand">in motion.</span></h2>
          </div>
          {instagram ? (
            <a href={instagram} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-light self-start md:self-auto"><Instagram className="h-4 w-4" strokeWidth={1.5} /> Follow on Instagram</a>
          ) : null}
        </div>
        <div className="no-scrollbar -mx-5 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 md:mx-0 md:px-0">
          {reels.map((r) => {
            const poster = r.thumbnail ?? (r.video?.url ? { url: videoPoster(r.video.url) } : undefined);
            const inner = (
              <>
                <Photo media={poster} alt={r.title ?? "Reel"} className="aspect-[9/16] w-full" imgClassName="opacity-85 transition duration-700 group-hover:scale-[1.03]" sizes="260px" label={r.label} />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-ivory/70 bg-ink/30 backdrop-blur-sm"><Play className="ml-0.5 h-5 w-5" strokeWidth={1.4} /></span>
                </span>
                {r.title ? <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-4 text-left text-sm">{r.title}</span> : null}
              </>
            );
            return (
              <div key={r._id} className="w-[62%] shrink-0 snap-start sm:w-[38%] md:w-[23%]">
                {r.video?.url ? (
                  <button type="button" onClick={() => setPlaying(r)} className="group relative block w-full overflow-hidden" aria-label={`Play ${r.title ?? "reel"}`}>{inner}</button>
                ) : r.instagramUrl ? (
                  <a href={r.instagramUrl} target="_blank" rel="noopener noreferrer" className="group relative block overflow-hidden" aria-label={`Watch ${r.title ?? "reel"} on Instagram`}>{inner}</a>
                ) : (
                  <div className="group relative overflow-hidden">{inner}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {playing?.video?.url ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/95 p-4" role="dialog" aria-modal="true" onClick={() => setPlaying(null)}>
          <button type="button" className="absolute right-4 top-4 text-ivory" aria-label="Close"><X className="h-7 w-7" strokeWidth={1.3} /></button>
          <video src={transformUrl(playing.video.url, "q_auto,vc_auto")} controls autoPlay playsInline className="max-h-[88vh] max-w-full" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </section>
  );
}
