"use client";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Star, X } from "lucide-react";
import Photo from "@/components/site/Photo";

const MAX_MB = 10;

export default function ImageUploader({ initial, name = "images" }: { initial: string[]; name?: string }) {
  const [images, setImages] = useState<string[]>(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(list: FileList | File[]) {
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return setError("Choose image files (JPG, PNG or WebP).");
    setError("");
    const signRes = await fetch("/api/admin/upload-sign", { method: "POST" });
    const s = await signRes.json().catch(() => ({}));
    if (!signRes.ok) return setError(s.error ?? "Upload isn't available.");

    await Promise.all(files.map(async (file) => {
      if (file.size > MAX_MB * 1024 * 1024) return setError(`${file.name} is over ${MAX_MB} MB.`);
      setBusy((n) => n + 1);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("api_key", s.apiKey);
        fd.append("timestamp", String(s.timestamp));
        fd.append("signature", s.signature);
        fd.append("folder", s.folder);
        const r = await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`, { method: "POST", body: fd });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error?.message ?? "Upload failed");
        setImages((prev) => [...prev, d.secure_url as string]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy((n) => n - 1);
      }
    }));
  }

  const move = (i: number, d: -1 | 1) =>
    setImages((p) => { const a = [...p]; const j = i + d; if (j < 0 || j >= a.length) return p; [a[i], a[j]] = [a[j], a[i]]; return a; });

  return (
    <div>
      <textarea name={name} value={images.join("\n")} readOnly hidden />
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); void upload(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${drag ? "border-lake bg-mist" : "border-line"}`}
      >
        <ImagePlus className="text-lake" />
        <p className="mt-2 text-sm">Drag photos here, or <button type="button" className="font-semibold underline underline-offset-4" onClick={() => input.current?.click()}>choose files</button></p>
        <p className="text-xs text-stone">JPG, PNG or WebP, up to {MAX_MB} MB each. The first photo is the cover.</p>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) void upload(e.target.files); e.target.value = ""; }} />
        {busy > 0 && <p role="status" className="mt-3 text-sm text-lake">Uploading {busy} photo{busy > 1 ? "s" : ""}…</p>}
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {images.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((src, i) => (
            <li key={src + i} className="overflow-hidden rounded-xl border border-line bg-white">
              <div className="relative aspect-[4/3]">
                <Photo src={src} alt={`Photo ${i + 1}`} className="h-full w-full" />
                {i === 0 && <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-marigold px-2 py-0.5 text-xs font-semibold"><Star size={11} /> Cover</span>}
              </div>
              <div className="flex items-center justify-between p-1.5">
                <div className="flex">
                  <button type="button" className="rounded-lg p-1.5 hover:bg-mist disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move photo ${i + 1} earlier`}><ArrowLeft size={15} /></button>
                  <button type="button" className="rounded-lg p-1.5 hover:bg-mist disabled:opacity-30" disabled={i === images.length - 1} onClick={() => move(i, 1)} aria-label={`Move photo ${i + 1} later`}><ArrowRight size={15} /></button>
                </div>
                <button type="button" className="rounded-lg p-1.5 text-red-700 hover:bg-red-50" onClick={() => setImages((p) => p.filter((_, k) => k !== i))} aria-label={`Remove photo ${i + 1}`}><X size={15} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Or paste an image link (https://…)" aria-label="Image link" className="field !py-2 text-sm" />
        <button type="button" className="btn btn-ghost !py-2 text-sm" disabled={!/^https?:\/\//.test(url)} onClick={() => { setImages((p) => [...p, url.trim()]); setUrl(""); }}>Add</button>
      </div>
    </div>
  );
}
