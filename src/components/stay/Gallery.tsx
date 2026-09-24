"use client";
import { useEffect, useState } from "react";
import { Grid2x2, X } from "lucide-react";
import Photo from "@/components/site/Photo";

export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [open]);

  const list = images.length ? images : [""];
  return (
    <>
      <div className="relative grid h-[280px] gap-2 overflow-hidden rounded-3xl md:h-[460px] md:grid-cols-4 md:grid-rows-2">
        <button onClick={() => setOpen(true)} className="md:col-span-2 md:row-span-2" aria-label="Open photo gallery">
          <Photo src={list[0]} alt={title} className="h-full w-full" />
        </button>
        {list.slice(1, 5).map((src, i) => (
          <button key={i} onClick={() => setOpen(true)} className="hidden md:block" aria-label={`Open photo ${i + 2}`}>
            <Photo src={src} alt={`${title} photo ${i + 2}`} className="h-full w-full" />
          </button>
        ))}
        {images.length > 1 && (
          <button onClick={() => setOpen(true)} className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold shadow">
            <Grid2x2 size={16} /> All {images.length} photos
          </button>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/90 p-4 md:p-10" role="dialog" aria-modal="true" aria-label={`${title} photos`}>
          <button onClick={() => setOpen(false)} className="fixed right-5 top-5 z-10 flex size-11 items-center justify-center rounded-full bg-white" aria-label="Close gallery"><X size={20} /></button>
          <div className="mx-auto grid max-w-4xl gap-4">
            {list.map((src, i) => <Photo key={i} src={src} alt={`${title} photo ${i + 1}`} className="w-full rounded-2xl" />)}
          </div>
        </div>
      )}
    </>
  );
}
