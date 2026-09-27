"use client";

import { useEffect, useState } from "react";
import { Upload, X, Link2, Loader2, Film, FileText } from "lucide-react";
import type { MediaRef } from "@/lib/media";
import { transformUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export interface MediaDoc {
  _id: string;
  publicId: string;
  url: string;
  resourceType: "image" | "video" | "raw";
  width?: number;
  height?: number;
  alt?: string;
  title?: string;
  folder?: string;
  linkedTo?: { kind: string; id: string; label: string }[];
}

export const toRef = (m: MediaDoc): MediaRef & { mediaId: string } => ({ mediaId: m._id, publicId: m.publicId, url: m.url, resourceType: m.resourceType, width: m.width, height: m.height, alt: m.alt ?? "" });

/** Signed direct upload to Cloudinary, then register in the Media collection. */
export async function uploadFile(file: File, folder: string): Promise<MediaDoc> {
  const sig = await fetch("/api/admin/media/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folder }) }).then((r) => r.json());
  if (!sig.ok) throw new Error(sig.error?.message ?? "Upload not configured");
  const s = sig.data;
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", s.apiKey);
  form.append("timestamp", String(s.timestamp));
  form.append("signature", s.signature);
  form.append("folder", s.folder);
  const up = await fetch(s.uploadUrl, { method: "POST", body: form }).then((r) => r.json());
  if (!up.secure_url) throw new Error(up.error?.message ?? "Cloudinary upload failed");
  const reg = await fetch("/api/admin/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId: up.public_id, url: up.secure_url, resourceType: up.resource_type, format: up.format, bytes: up.bytes, width: up.width, height: up.height, title: file.name.replace(/\.[^.]+$/, ""), alt: "", folder }),
  }).then((r) => r.json());
  if (!reg.ok) throw new Error(reg.error?.message ?? "Could not save media");
  return reg.data as MediaDoc;
}

export function Thumb({ media, className }: { media: { url: string; resourceType?: string; alt?: string }; className?: string }) {
  if (media.resourceType === "video") return <div className={cn("flex items-center justify-center bg-linen", className)}><Film className="h-6 w-6 text-umber" /></div>;
  if (media.resourceType === "raw" || /\.pdf($|\?)/i.test(media.url)) return <div className={cn("flex items-center justify-center bg-linen", className)}><FileText className="h-6 w-6 text-umber" /></div>;
  return <img src={transformUrl(media.url, "f_auto,q_auto,w_400,h_400,c_fill,g_auto")} alt={media.alt ?? ""} className={cn("object-cover", className)} loading="lazy" />;
}

/** Modal library browser with upload + paste-URL fallback. */
export function MediaPicker({ folder = "general", multiple, onPick, onClose }: { folder?: string; multiple?: boolean; onPick: (items: MediaRef[]) => void; onClose: () => void }) {
  const [items, setItems] = useState<MediaDoc[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState(folder);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const sp = new URLSearchParams();
    if (filter) sp.set("folder", filter);
    if (q) sp.set("q", q);
    fetch(`/api/admin/media?${sp}`).then((r) => r.json()).then((j) => setItems(j?.data?.items ?? [])).catch(() => setItems([]));
  }, [filter, q]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded: MediaDoc[] = [];
      for (const f of Array.from(files)) uploaded.push(await uploadFile(f, filter || "general"));
      setItems((prev) => [...uploaded, ...prev]);
      setSelected((s) => (multiple ? [...s, ...uploaded.map((u) => u._id)] : [uploaded[0]._id]));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addUrl() {
    if (!/^https:\/\//.test(url)) return setError("Enter an https:// URL");
    const res = await fetch("/api/admin/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicId: `external:${url}`.slice(0, 300), url, resourceType: /\.(mp4|webm|mov)$/i.test(url) ? "video" : /\.pdf$/i.test(url) ? "raw" : "image", folder: filter || "general" }) }).then((r) => r.json());
    if (!res.ok) return setError(res.error?.message ?? "Could not add URL");
    setItems((prev) => [res.data, ...prev]);
    setSelected((s) => (multiple ? [...s, res.data._id] : [res.data._id]));
    setUrl("");
  }

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : multiple ? [...s, id] : [id]));
  const confirm = () => {
    const picked = selected.map((id) => items.find((i) => i._id === id)).filter(Boolean) as MediaDoc[];
    onPick(picked.map(toRef));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/60 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col bg-ivory">
        <div className="flex items-center justify-between border-b hairline p-5">
          <p className="display text-2xl text-ink">Media library</p>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b hairline p-4">
          <select className="input !w-auto !py-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All folders</option>
            {["properties", "tours", "packages", "banners", "experiences", "testimonials", "reels", "itineraries", "pages", "brand", "general"].map((f) => <option key={f}>{f}</option>)}
          </select>
          <input className="input !w-48 !py-2 text-sm" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="btn btn-primary cursor-pointer !py-2.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
            <input type="file" className="hidden" multiple={multiple} accept="image/*,video/*,application/pdf" onChange={(e) => onFiles(e.target.files)} />
          </label>
          <div className="flex flex-1 gap-2">
            <input className="input !py-2 text-sm" placeholder="…or paste an image URL" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button className="btn btn-outline !px-3 !py-2" onClick={addUrl} type="button"><Link2 className="h-4 w-4" /></button>
          </div>
        </div>
        {error ? <p className="bg-[#f0dfd9] px-5 py-2 text-sm text-danger">{error}</p> : null}
        <div className="grid flex-1 grid-cols-3 gap-2 overflow-y-auto p-4 sm:grid-cols-4 md:grid-cols-6">
          {items.map((m) => (
            <button key={m._id} type="button" onClick={() => toggle(m._id)} className={cn("relative aspect-square overflow-hidden h-max  border-2", selected.includes(m._id) ? "border-charcoal" : "border-transparent")}>
              <Thumb media={m} className="h-full w-full" />
              {selected.includes(m._id) ? <span className="absolute right-1 top-1 bg-charcoal px-1.5 text-[0.6rem] text-ivory">{selected.indexOf(m._id) + 1}</span> : null}
            </button>
          ))}
          {!items.length ? <p className="col-span-full py-10 text-center text-sm text-muted">No media here yet — upload some.</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t hairline p-4">
          <button className="btn btn-outline !py-2.5" onClick={onClose} type="button">Cancel</button>
          <button className="btn btn-primary !py-2.5" onClick={confirm} disabled={!selected.length} type="button">Use {selected.length > 1 ? `${selected.length} items` : "selected"}</button>
        </div>
      </div>
    </div>
  );
}
