"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Upload, Loader2, Trash2, Copy } from "lucide-react";
import { Thumb, uploadFile, type MediaDoc } from "./media-picker";

const LINKS: [string, string][] = [["", "Any usage"], ["properties", "Properties"], ["tours", "Darshan tours"], ["packages", "Packages"], ["banners", "Banners"], ["experiences", "Experiences"], ["testimonials", "Testimonials"], ["reels", "Reels"], ["itineraries", "Itineraries"], ["pages", "Pages"], ["settings", "Settings"], ["unused", "Not used anywhere"]];
const FOLDERS = ["properties", "tours", "packages", "banners", "experiences", "testimonials", "reels", "itineraries", "pages", "brand", "general"];

export function MediaLibrary() {
  const [items, setItems] = useState<MediaDoc[]>([]);
  const [folder, setFolder] = useState("");
  const [type, setType] = useState("");
  const [linked, setLinked] = useState("");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<MediaDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const sp = new URLSearchParams();
    if (folder) sp.set("folder", folder);
    if (type) sp.set("type", type);
    if (linked) sp.set("linked", linked);
    if (q) sp.set("q", q);
    fetch(`/api/admin/media?${sp}`).then((r) => r.json()).then((j) => setItems(j?.data?.items ?? []));
  }, [folder, type, q, linked]);
  useEffect(load, [load]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const f of Array.from(files)) await uploadFile(f, folder || "general");
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveMeta() {
    if (!active) return;
    await fetch(`/api/admin/media/${active._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: active.title, alt: active.alt, folder: active.folder }) });
    load();
  }
  async function remove() {
    if (!active) return;
    const used = active.linkedTo?.length ? ` It is used by ${active.linkedTo.map((l) => l.label).join(", ")}.` : "";
    if (!confirm(`Delete this file from Cloudinary and the library?${used} Pages using it will show a placeholder.`)) return;
    await fetch(`/api/admin/media/${active._id}`, { method: "DELETE" });
    setActive(null);
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          <select className="input !w-auto !py-2 text-sm" value={folder} onChange={(e) => setFolder(e.target.value)}>
            <option value="">All folders</option>
            {FOLDERS.map((f) => <option key={f}>{f}</option>)}
          </select>
          <select className="input !w-auto !py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="raw">Documents</option>
          </select>
          <select className="input !w-auto !py-2 text-sm" value={linked} onChange={(e) => setLinked(e.target.value)}>
            {LINKS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input className="input !w-56 !py-2 text-sm" placeholder="Search title / alt / used by…" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="btn btn-primary ml-auto cursor-pointer !py-2.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload{folder ? ` to ${folder}` : ""}
            <input type="file" multiple className="hidden" accept="image/*,video/*,application/pdf" onChange={(e) => onFiles(e.target.files)} />
          </label>
        </div>
        {error ? <p className="mb-4 bg-[#f0dfd9] p-3 text-sm text-danger">{error}</p> : null}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
          {items.map((m) => (
            <button key={m._id} onClick={() => setActive(m)} className={`aspect-square overflow-hidden border-2 ${active?._id === m._id ? "border-charcoal" : "border-transparent"}`}>
              <Thumb media={m} className="h-full w-full" />
            </button>
          ))}
          {!items.length ? <p className="col-span-full py-16 text-center text-muted">No media yet.</p> : null}
        </div>
      </div>
      <aside className="border hairline bg-paper p-5 lg:sticky lg:top-6 lg:self-start">
        {active ? (
          <div className="space-y-4">
            <Thumb media={active} className="aspect-square w-full" />
            <label className="field"><span className="field-label">Title</span><input className="input !py-2 text-sm" value={active.title ?? ""} onChange={(e) => setActive({ ...active, title: e.target.value })} /></label>
            <label className="field"><span className="field-label">Alt text</span><textarea className="input text-sm" value={active.alt ?? ""} onChange={(e) => setActive({ ...active, alt: e.target.value })} /></label>
            <label className="field"><span className="field-label">Folder</span>
              <select className="input !py-2 text-sm" value={active.folder ?? "general"} onChange={(e) => setActive({ ...active, folder: e.target.value })}>{FOLDERS.map((f) => <option key={f}>{f}</option>)}</select>
            </label>
            <div>
              <p className="field-label mb-2">Used by</p>
              {active.linkedTo?.length ? (
                <ul className="space-y-1 text-sm">
                  {active.linkedTo.map((l) => (
                    <li key={`${l.kind}${l.id}`}>
                      <Link className="underline" href={l.kind === "settings" ? "/admin/settings" : `/admin/${l.kind}/${l.id}`}>{l.label}</Link> <span className="text-xs text-muted">· {l.kind}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Not used yet — pick it from any image field.</p>
              )}
            </div>
            <p className="break-all font-mono text-[0.65rem] text-muted">{active.url}</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary !py-2.5" onClick={saveMeta}>Save</button>
              <button className="btn btn-outline !px-3 !py-2.5" onClick={() => navigator.clipboard.writeText(active.url)} aria-label="Copy URL"><Copy className="h-4 w-4" /></button>
              <button className="ml-auto text-sm text-danger" onClick={remove}><Trash2 className="inline h-4 w-4" /> Delete</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Select a file to edit its title, alt text and folder.</p>
        )}
      </aside>
    </div>
  );
}
