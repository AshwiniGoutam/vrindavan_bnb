import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { requireAdmin } from "@/server/auth/session";
import { connectDB } from "@/server/db/connect";
import { resourceOrThrow } from "@/server/admin/registry";
import * as models from "@/server/models";
import { getResource } from "@/admin/resources";
import { PageHeader, Badge } from "@/components/admin/shell";
import { Thumb } from "@/components/admin/media-picker";
import { QuickToggle } from "@/components/admin/quick-toggle";
import { formatINR } from "@/lib/money";
import { getPath } from "@/lib/utils";

type Props = { params: Promise<{ resource: string }>; searchParams: Promise<{ q?: string; page?: string }> };

export async function generateMetadata({ params }: Props) {
  const { resource } = await params;
  return { title: getResource(resource)?.label ?? "Admin" };
}

export default async function ResourceList({ params, searchParams }: Props) {
  const { resource } = await params;
  const { q, page: pageParam } = await searchParams;
  const config = getResource(resource);
  if (!config || resource === "settings") notFound();
  await requireAdmin(config.permission);
  const { model } = resourceOrThrow(resource);
  await connectDB();

  const page = Math.max(1, Number(pageParam ?? 1));
  const filter: Record<string, unknown> = {};
  if (q && config.searchFields?.length) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = config.searchFields.map((f) => ({ [f]: rx }));
  }
  const [items, total] = await Promise.all([
    model.find(filter).sort(config.defaultSort ?? { createdAt: -1 }).skip((page - 1) * 50).limit(50).lean<Record<string, unknown>[]>(),
    model.countDocuments(filter),
  ]);

  // Resolve ref columns (e.g. propertyId → name) for readable tables.
  const refLabels: Record<string, string> = {};
  for (const col of config.columns) {
    const field = config.fields.find((f) => f.name === col.name && f.type === "ref");
    if (!field?.ref) continue;
    const refConf = getResource(field.ref);
    const refModel = refConf && (models as unknown as Record<string, typeof model>)[refConf.model];
    if (!refConf || !refModel) continue;
    const ids = items.map((i) => getPath(i, col.name)).filter(Boolean);
    const docs = await refModel.find({ _id: { $in: ids } }).select(refConf.titleField).lean<Record<string, unknown>[]>();
    for (const d of docs) refLabels[String(d._id)] = String(getPath(d, refConf.titleField) ?? "");
  }

  const hasPublishing = config.fields.some((f) => f.name === "publishing.status");
  const hasMaintenance = config.key === "properties";
  const hasActions = hasPublishing || hasMaintenance;

  const cell = (item: Record<string, unknown>, col: (typeof config.columns)[number]) => {
    const v = getPath(item, col.name);
    switch (col.type) {
      case "money":
        return v == null ? "—" : formatINR(Number(v));
      case "badge":
        return <Badge value={v as string} />;
      case "boolean":
        return v ? "Yes" : "—";
      case "date":
        return v ? new Date(String(v)).toLocaleDateString("en-IN") : "—";
      case "datetime":
        return v ? new Date(String(v)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—";
      case "image": {
        const m = v as { url?: string } | undefined;
        return m?.url ? <Thumb media={{ url: m.url }} className="h-12 w-12" /> : <div className="photo-fallback h-12 w-12" />;
      }
      default:
        if (v && refLabels[String(v)]) return refLabels[String(v)];
        return v == null || v === "" ? "—" : String(v);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={config.group}
        title={config.label}
        description={config.description}
        actions={config.canCreate !== false ? <Link href={`/admin/${config.key}/new`} className="btn btn-primary !py-3"><Plus className="h-4 w-4" /> New {config.singular.toLowerCase()}</Link> : null}
      />
      {config.searchFields?.length ? (
        <form className="mb-5 flex max-w-md items-center gap-2 border hairline bg-paper px-3">
          <Search className="h-4 w-4 text-muted" />
          <input name="q" defaultValue={q} placeholder={`Search ${config.label.toLowerCase()}…`} className="w-full bg-transparent py-2.5 text-sm outline-none" />
        </form>
      ) : null}
      <div className="overflow-x-auto border hairline bg-paper">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              {config.columns.map((c) => <th key={c.name} className="px-4 py-3 font-normal">{c.label}</th>)}
              {hasActions ? <th className="px-4 py-3 font-normal">Quick actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={String(item._id)} className="border-t hairline hover:bg-ivory">
                {config.columns.map((c, i) => (
                  <td key={c.name} className="px-4 py-3 align-middle">
                    {i === 0 || (i === 1 && config.columns[0].type === "image") ? (
                      <Link href={`/admin/${config.key}/${item._id}`} className={c.type === "image" ? "" : "font-medium text-ink underline-offset-4 hover:underline"}>{cell(item, c)}</Link>
                    ) : (
                      cell(item, c)
                    )}
                  </td>
                ))}
                {hasActions ? (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {hasPublishing ? (
                        <QuickToggle resource={config.key} id={String(item._id)} field="publishing.status" value={getPath(item, "publishing.status") as string} on="published" off="unpublished" labelOn="Publish" labelOff="Unpublish" />
                      ) : null}
                      {hasMaintenance ? (
                        <QuickToggle resource={config.key} id={String(item._id)} field="status" value={getPath(item, "status") as string} on="active" off="maintenance" labelOn="Reopen" labelOff="Maintenance" />
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
            {!items.length ? <tr><td colSpan={config.columns.length + (hasActions ? 1 : 0)} className="px-4 py-12 text-center text-muted">Nothing here yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
      {total > 50 ? (
        <div className="mt-4 flex items-center gap-4 text-sm">
          {page > 1 ? <Link href={`?page=${page - 1}${q ? `&q=${q}` : ""}`} className="underline">← Previous</Link> : null}
          <span className="text-muted">Page {page} of {Math.ceil(total / 50)}</span>
          {page * 50 < total ? <Link href={`?page=${page + 1}${q ? `&q=${q}` : ""}`} className="underline">Next →</Link> : null}
        </div>
      ) : null}
    </>
  );
}
