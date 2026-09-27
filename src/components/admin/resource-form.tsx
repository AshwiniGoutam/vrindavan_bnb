"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, X, ExternalLink } from "lucide-react";
import type { Field, Option, ResourceConfig } from "@/admin/fields";
import type { MediaRef } from "@/lib/media";
import { cn, getPath, setPath, slugify } from "@/lib/utils";
import { MediaPicker, Thumb } from "./media-picker";
import { DEFAULT_ROOMS, GalleryField } from "./gallery-field";

type Doc = Record<string, unknown>;

function useRefOptions(fields: Field[]) {
  const refs = useMemo(() => Array.from(new Set(fields.flatMap((f) => [f, ...(f.fields ?? [])]).filter((f) => f.ref).map((f) => f.ref!))), [fields]);
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  useEffect(() => {
    refs.forEach((r) =>
      fetch(`/api/admin/resources/${r}?options=1`)
        .then((res) => res.json())
        .then((j) => setOptions((o) => ({ ...o, [r]: j?.data ?? [] })))
        .catch(() => undefined),
    );
  }, [refs]);
  return options;
}

const widthClass = (w?: string) => (w === "half" ? "md:col-span-3" : w === "third" ? "md:col-span-2" : "md:col-span-6");

export function ResourceForm({ config, initial, id, singleton }: { config: ResourceConfig; initial: Doc; id?: string; singleton?: boolean }) {
  const router = useRouter();
  const isNew = !id && !singleton;
  const [doc, setDoc] = useState<Doc>(() => {
    if (!isNew) return initial;
    let d: Doc = {};
    for (const f of config.fields) if (f.default !== undefined) d = setPath(d, f.name, f.default);
    return d;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const options = useRefOptions(config.fields);
  const sections = Array.from(new Set(config.fields.map((f) => f.section ?? "Details")));
  const [tab, setTab] = useState(sections[0]);

  const set = (name: string, value: unknown) => {
    setDoc((d) => setPath(d, name, value));
    setStatus("idle");
  };

  async function save() {
    setStatus("saving");
    setErrors({});
    setMessage(null);
    const url = singleton ? `/api/admin/resources/${config.key}/site` : isNew ? `/api/admin/resources/${config.key}` : `/api/admin/resources/${config.key}/${id}`;
    const res = await fetch(url, { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      setStatus("idle");
      const fields = json?.error?.details?.fields ?? json?.error?.fields ?? {};
      setErrors(fields);
      setMessage(json?.error?.message ?? "Could not save.");
      const firstBad = config.fields.find((f) => fields[f.name]);
      if (firstBad) setTab(firstBad.section ?? "Details");
      return;
    }
    setStatus("saved");
    if (isNew) router.replace(`/admin/${config.key}/${json.data._id}`);
    else router.refresh();
  }

  async function remove() {
    if (!id || !confirm(`Delete this ${config.singular.toLowerCase()}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/resources/${config.key}/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (json.ok) router.replace(`/admin/${config.key}`);
    else setMessage(json?.error?.message ?? "Could not delete.");
  }

  const publicPath = config.publicPath && !isNew ? config.publicPath.replace(/\{(\w+)\}/g, (_, k) => String(getPath(doc, k) ?? "")) : null;

  return (
    <div className="pb-28">
      {sections.length > 1 ? (
        <div className="no-scrollbar sticky top-14 z-20 -mx-4 mb-6 flex gap-1 overflow-x-auto border-b hairline bg-ivory px-4 lg:top-0 lg:mx-0 lg:px-0">
          {sections.map((s) => {
            const hasErr = config.fields.some((f) => (f.section ?? "Details") === s && errors[f.name]);
            return (
              <button key={s} type="button" onClick={() => setTab(s)} className={cn("shrink-0 border-b-2 px-3 py-3 text-sm", tab === s ? "border-charcoal text-ink" : "border-transparent text-muted hover:text-ink", hasErr && "text-danger")}>
                {s}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-6">
        {config.fields
          .filter((f) => (f.section ?? "Details") === tab)
          .map((f) => (
            <div key={f.name} className={widthClass(f.width ?? (["list", "gallery", "textarea", "refs", "lines", "tags", "multiselect"].includes(f.type) ? "full" : "half"))}>
              <FieldInput field={f} value={getPath(doc, f.name)} onChange={(v) => set(f.name, v)} options={options} error={errors[f.name]} doc={doc} titleField={config.titleField} isNew={isNew} />
            </div>
          ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t hairline bg-ivory/95 backdrop-blur lg:left-64">
        <div className="flex items-center gap-3 px-4 py-3 md:px-10">
          <button type="button" onClick={save} disabled={status === "saving"} className="btn btn-primary !py-3">{status === "saving" ? "Saving…" : isNew ? `Create ${config.singular.toLowerCase()}` : "Save changes"}</button>
          {status === "saved" ? <span className="text-sm text-success">Saved</span> : null}
          {message ? <span className="text-sm text-danger">{message}</span> : null}
          <div className="ml-auto flex items-center gap-3">
            {publicPath ? <a href={publicPath} target="_blank" className="flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ExternalLink className="h-4 w-4" /> View</a> : null}
            {!isNew && !singleton && config.canDelete !== false ? (
              <button type="button" onClick={remove} className="flex items-center gap-1.5 text-sm text-danger"><Trash2 className="h-4 w-4" /> Delete</button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldInput({ field: f, value, onChange, options, error, doc, titleField, isNew }: { field: Field; value: unknown; onChange: (v: unknown) => void; options: Record<string, Option[]>; error?: string; doc: Doc; titleField: string; isNew: boolean }) {
  const [picker, setPicker] = useState<null | "single" | "multi">(null);
  const label = (
    <span className="field-label">
      {f.label}
      {f.required ? " *" : ""}
    </span>
  );
  const help = error ? <span className="text-xs text-danger">{error}</span> : f.help ? <span className="text-xs text-muted">{f.help}</span> : null;
  const str = (v: unknown) => (v == null ? "" : String(v));

  switch (f.type) {
    case "text":
    case "time":
    case "password":
      return (
        <label className="field">{label}
          <input className="input" type={f.type === "password" ? "password" : f.type === "time" ? "time" : "text"} autoComplete={f.type === "password" ? "new-password" : undefined} placeholder={f.placeholder} value={f.type === "password" ? str(value) : str(value)} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} />
          {help}
        </label>
      );
    case "slug":
      return (
        <label className="field">{label}
          <div className="flex gap-2">
            <input className="input font-mono text-sm" value={str(value)} onChange={(e) => onChange(slugify(e.target.value))} aria-invalid={!!error} />
            <button type="button" className="btn btn-outline !px-3 !py-2 text-[0.65rem]" onClick={() => onChange(slugify(str(getPath(doc, titleField))))}>Generate</button>
          </div>
          {help ?? (isNew ? <span className="text-xs text-muted">Leave empty to generate from the name.</span> : null)}
        </label>
      );
    case "textarea":
      return (
        <label className="field">{label}
          <textarea className="input min-h-32 leading-relaxed" placeholder={f.placeholder} value={str(value)} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} />
          {help}
        </label>
      );
    case "number":
    case "percent":
      return (
        <label className="field">{label}
          <input className="input" type="number" step="any" value={value == null ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} aria-invalid={!!error} />
          {help}
        </label>
      );
    case "money":
      return (
        <label className="field">{label}
          <div className="flex items-center">
            <span className="border hairline border-r-0 bg-linen px-3 py-[0.8rem] text-sm text-muted">₹</span>
            <input className="input" type="number" min={0} step="1" value={value == null ? "" : String(Number(value) / 100)} onChange={(e) => onChange(e.target.value === "" ? null : Math.round(Number(e.target.value) * 100))} aria-invalid={!!error} />
          </div>
          {help}
        </label>
      );
    case "boolean":
      return (
        <label className="flex h-full cursor-pointer items-center gap-3 border hairline bg-paper px-4 py-3">
          <input type="checkbox" className="h-4 w-4 accent-charcoal" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          <span className="text-sm">{f.label}</span>
        </label>
      );
    case "select":
      return (
        <label className="field">{label}
          <select className="input" value={str(value)} onChange={(e) => onChange(e.target.value || null)} aria-invalid={!!error}>
            {!f.required ? <option value="">—</option> : null}
            {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {help}
        </label>
      );
    case "ref":
      return (
        <label className="field">{label}
          <select className="input" value={str(value)} onChange={(e) => onChange(e.target.value || null)} aria-invalid={!!error}>
            <option value="">—</option>
            {(options[f.ref!] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {help}
        </label>
      );
    case "multiselect":
    case "refs": {
      const opts = f.type === "refs" ? options[f.ref!] ?? [] : f.options ?? [];
      const current = ((value as unknown[]) ?? []).map(String);
      return (
        <div className="field">{label}
          <div className="flex flex-wrap gap-2 border hairline bg-paper p-3">
            {opts.map((o) => {
              const on = current.includes(o.value);
              return (
                <button key={o.value} type="button" onClick={() => {
                  const next = on ? current.filter((x) => x !== o.value) : [...current, o.value];
                  onChange(f.numeric ? next.map(Number) : next);
                }} className={cn("border px-3 py-1.5 text-xs", on ? "border-charcoal bg-charcoal text-ivory" : "hairline hover:border-charcoal")}>
                  {o.label}
                </button>
              );
            })}
            {!opts.length ? <span className="text-xs text-muted">Nothing to choose yet.</span> : null}
          </div>
          {help}
        </div>
      );
    }
    case "tags":
      return <TagsInput label={label} help={help} value={(value as string[]) ?? []} onChange={onChange} placeholder={f.placeholder} />;
    case "lines":
      return (
        <label className="field">{label}
          <textarea className="input min-h-28 leading-relaxed" value={((value as string[]) ?? []).join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))} onBlur={(e) => onChange(e.target.value.split("\n").map((s: string) => s.trim()).filter(Boolean))} />
          {help}
        </label>
      );
    case "date":
      return (
        <label className="field">{label}
          <input className="input" type="date" value={str(value)} onChange={(e) => onChange(e.target.value || null)} aria-invalid={!!error} />
          {help}
        </label>
      );
    case "image": {
      const m = value as MediaRef | null;
      return (
        <div className="field">{label}
          <div className="flex items-start gap-4 border hairline bg-paper p-3">
            {m?.url ? <Thumb media={m} className="h-24 w-24 shrink-0" /> : <div className="photo-fallback h-24 w-24 shrink-0" />}
            <div className="flex flex-1 flex-col gap-2">
              {m?.url ? <input className="input !py-2 text-sm" placeholder="Alt text (describe the image)" value={m.alt ?? ""} onChange={(e) => onChange({ ...m, alt: e.target.value })} /> : null}
              <div className="flex gap-2">
                <button type="button" className="btn btn-outline !px-3 !py-2 text-[0.65rem]" onClick={() => setPicker("single")}><ImagePlus className="h-3.5 w-3.5" /> {m?.url ? "Replace" : "Choose"}</button>
                {m?.url ? <button type="button" className="text-xs text-danger" onClick={() => onChange(null)}>Remove</button> : null}
              </div>
            </div>
          </div>
          {help}
          {picker ? <MediaPicker folder={f.folder} onClose={() => setPicker(null)} onPick={(items) => onChange(items[0] ?? null)} /> : null}
        </div>
      );
    }
    case "gallery": {
      const tour = f.groupsFrom ? ((getPath(doc, f.groupsFrom) as { name?: string }[] | undefined) ?? []).map((r) => r.name).filter((n): n is string => !!n) : undefined;
      return <GalleryField label={label} help={help} value={(value as MediaRef[]) ?? []} onChange={onChange} folder={f.folder} rooms={f.groupsFrom ? (tour && tour.length ? tour : DEFAULT_ROOMS) : undefined} />;
    }
    case "list": {
      const rows = (value as Doc[]) ?? [];
      const update = (i: number, name: string, v: unknown) => onChange(rows.map((r, k) => (k === i ? setPath(r, name, v) : r)));
      return (
        <div className="field">{label}
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={i} className="relative border hairline bg-paper p-4 pr-12">
                <div className="absolute right-2 top-2 flex flex-col gap-1">
                  <button type="button" aria-label="Remove row" className="p-1 text-danger" onClick={() => onChange(rows.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></button>
                  {i > 0 ? <button type="button" aria-label="Move up" className="p-1" onClick={() => { const n = [...rows]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }}><ArrowUp className="h-4 w-4" /></button> : null}
                </div>
                <div className="grid gap-3 md:grid-cols-6">
                  {(f.fields ?? []).map((sf) => (
                    <div key={sf.name} className={["textarea", "lines", "image"].includes(sf.type) ? "md:col-span-6" : (f.fields ?? []).length <= 2 ? "md:col-span-3" : "md:col-span-2"}>
                      <FieldInput field={sf} value={getPath(row, sf.name)} onChange={(v) => update(i, sf.name, v)} options={options} doc={row} titleField="" isNew={false} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-outline !py-2.5 text-[0.65rem]" onClick={() => onChange([...rows, (f.fields ?? []).some((x) => x.name === "day") ? { day: rows.length + 1 } : {}])}>
              <Plus className="h-3.5 w-3.5" /> Add {f.label.toLowerCase().replace(/s$/, "")}
            </button>
          </div>
          {help}
        </div>
      );
    }
    case "readonly":
      return (
        <div className="field">{label}
          <p className="min-h-[2.9rem] whitespace-pre-line border hairline bg-linen/50 px-3 py-3 text-sm">{value == null || value === "" ? "—" : String(value)}</p>
        </div>
      );
  }
}

function TagsInput({ label, help, value, onChange, placeholder }: { label: React.ReactNode; help: React.ReactNode; value: string[]; onChange: (v: unknown) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="field">{label}
      <div className="flex flex-wrap items-center gap-2 border hairline bg-paper p-2">
        {value.map((t) => (
          <span key={t} className="flex items-center gap-1 bg-linen px-2 py-1 text-xs">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input className="min-w-40 flex-1 bg-transparent px-2 py-1 text-sm outline-none" placeholder={placeholder ?? "Type and press Enter"} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} onBlur={add} />
      </div>
      {help}
    </div>
  );
}
