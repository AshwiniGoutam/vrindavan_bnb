"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, ImagePlus, X } from "lucide-react";
import type { MediaRef } from "@/lib/media";
import { cn } from "@/lib/utils";
import { MediaPicker, Thumb } from "./media-picker";

export const DEFAULT_ROOMS = ["Living room", "Full kitchen", "Dining area", "Bedroom 1", "Bedroom 2", "Full bathroom 1", "Full bathroom 2", "Exterior"];
const UNTAGGED = "__untagged";

/**
 * Gallery editor. With `rooms`, every photo can be tagged to a room for the public "Photo tour":
 * - pick a room tab, then Add → uploaded photos are tagged to that room automatically
 * - or tick several photos and "Assign to" a room in one go
 * Untagged photos appear under "Additional photos" on the website.
 */
export function GalleryField({ label, help, value, onChange, folder, rooms }: { label: React.ReactNode; help: React.ReactNode; value: MediaRef[]; onChange: (v: MediaRef[]) => void; folder?: string; rooms?: string[] }) {
  const list = value ?? [];
  const [picker, setPicker] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [assignTo, setAssignTo] = useState<string>("");
  const tagging = !!rooms;

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of list) c[m.group || UNTAGGED] = (c[m.group || UNTAGGED] ?? 0) + 1;
    return c;
  }, [list]);
  // rooms defined on the property + any group names already used on photos
  const roomOptions = useMemo(() => Array.from(new Set([...(rooms ?? []), ...list.map((m) => m.group).filter((g): g is string => !!g)])), [rooms, list]);

  const commit = (next: MediaRef[]) => onChange(next.map((m, k) => ({ ...m, sortOrder: k })));
  const move = (i: number, d: number) => {
    const next = [...list];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    commit(next);
    setSelected([]);
  };
  const visible = list.map((m, i) => ({ m, i })).filter(({ m }) => !filter || (filter === UNTAGGED ? !m.group : m.group === filter));
  const toggle = (i: number) => setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  const assign = (room: string) => {
    commit(list.map((m, k) => (selected.includes(k) ? { ...m, group: room || undefined } : m)));
    setSelected([]);
  };

  return (
    <div className="field">
      {label}
      {tagging ? (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          {[["", `All (${list.length})`], ...roomOptions.map((r) => [r, `${r} (${counts[r] ?? 0})`]), [UNTAGGED, `Not tagged (${counts[UNTAGGED] ?? 0})`]].map(([key, text]) => (
            <button key={key || "all"} type="button" onClick={() => { setFilter(key); setSelected([]); }} className={cn("shrink-0 border px-3 py-1.5 text-xs", filter === key ? "border-charcoal bg-charcoal text-ivory" : "hairline hover:border-charcoal", key === UNTAGGED && (counts[UNTAGGED] ?? 0) > 0 && filter !== key && "text-danger")}>
              {text}
            </button>
          ))}
        </div>
      ) : null}

      {tagging && selected.length ? (
        <div className="flex flex-wrap items-center gap-2 border border-charcoal bg-ivory p-2 text-sm">
          <span className="px-1">{selected.length} selected</span>
          <select className="input !w-auto !py-1.5 text-sm" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
            <option value="">Additional photos (no room)</option>
            {roomOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="button" className="btn btn-primary !px-4 !py-2 text-[0.65rem]" onClick={() => assign(assignTo)}>Assign</button>
          <button type="button" className="text-xs underline" onClick={() => setSelected(visible.map((v) => v.i))}>Select all shown</button>
          <button type="button" className="ml-auto text-xs underline" onClick={() => setSelected([])}>Clear</button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 border hairline bg-paper p-3 sm:grid-cols-3 lg:grid-cols-5">
        {visible.map(({ m, i }) => {
          const isSel = selected.includes(i);
          return (
            <div key={`${m.url}${i}`} className="space-y-1.5">
              <div className={cn("relative border-2", isSel ? "border-charcoal" : "border-transparent")}>
                <button type="button" onClick={() => (tagging ? toggle(i) : undefined)} className="block w-full" aria-label={tagging ? "Select photo" : undefined} aria-pressed={isSel}>
                  <Thumb media={m} className="aspect-square w-full" />
                </button>
                {tagging ? (
                  <span className={cn("pointer-events-none absolute left-1 top-1 flex h-5 w-5 items-center justify-center border", isSel ? "border-charcoal bg-charcoal text-ivory" : "border-ivory bg-ink/30")}>
                    {isSel ? <Check className="h-3 w-3" /> : null}
                  </span>
                ) : null}
                {i === 0 ? <span className="absolute bottom-1 left-1 bg-ivory px-1.5 text-[0.6rem] uppercase tracking-wider">Cover</span> : null}
                <div className="absolute right-1 top-1 flex gap-1">
                  {i > 0 ? <button type="button" onClick={() => move(i, -1)} className="bg-ivory p-1" aria-label="Move earlier"><ArrowUp className="h-3 w-3" /></button> : null}
                  {i < list.length - 1 ? <button type="button" onClick={() => move(i, 1)} className="bg-ivory p-1" aria-label="Move later"><ArrowDown className="h-3 w-3" /></button> : null}
                  <button type="button" onClick={() => { commit(list.filter((_, k) => k !== i)); setSelected([]); }} className="bg-ivory p-1 text-danger" aria-label="Remove"><X className="h-3 w-3" /></button>
                </div>
              </div>
              {tagging ? (
                <select className="input !px-2 !py-1.5 text-xs" value={m.group ?? ""} onChange={(e) => commit(list.map((x, k) => (k === i ? { ...x, group: e.target.value || undefined } : x)))} aria-label="Room">
                  <option value="">— Additional photos</option>
                  {roomOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : null}
              <input className="input !px-2 !py-1.5 text-xs" placeholder="Alt text" value={m.alt ?? ""} onChange={(e) => onChange(list.map((x, k) => (k === i ? { ...x, alt: e.target.value } : x)))} />
            </div>
          );
        })}
        <button type="button" onClick={() => setPicker(true)} className="flex aspect-square flex-col items-center justify-center gap-2 border border-dashed border-taupe p-2 text-center text-xs text-muted hover:text-ink">
          <ImagePlus className="h-5 w-5" />
          {tagging && filter && filter !== UNTAGGED ? `Add to ${filter}` : "Add photos"}
        </button>
      </div>
      {tagging ? <span className="text-xs text-muted">Tip: click a room tab, then “Add to …” — new photos are tagged to that room. Or tick photos and use Assign. Rooms and their amenity lines are set in “Photo tour rooms” below.</span> : null}
      {help}
      {picker ? (
        <MediaPicker
          multiple
          folder={folder}
          onClose={() => setPicker(false)}
          onPick={(items) => {
            const room = tagging && filter && filter !== UNTAGGED ? filter : undefined;
            commit([...list, ...items.map((m) => ({ ...m, ...(room ? { group: room } : {}) }))]);
          }}
        />
      ) : null}
    </div>
  );
}
