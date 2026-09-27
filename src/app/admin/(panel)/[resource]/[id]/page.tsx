import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isValidObjectId } from "mongoose";
import { requireAdmin } from "@/server/auth/session";
import { connectDB } from "@/server/db/connect";
import { resourceOrThrow } from "@/server/admin/registry";
import { getResource } from "@/admin/resources";
import { serialize } from "@/server/types";
import { PageHeader } from "@/components/admin/shell";
import { ResourceForm } from "@/components/admin/resource-form";
import { getPath } from "@/lib/utils";

type Props = { params: Promise<{ resource: string; id: string }> };

export default async function ResourceEdit({ params }: Props) {
  const { resource, id } = await params;
  const config = getResource(resource);
  if (!config || resource === "settings") notFound();
  await requireAdmin(config.permission);
  const isNew = id === "new";
  if (isNew && config.canCreate === false) notFound();
  let doc: Record<string, unknown> = {};
  if (!isNew) {
    if (!isValidObjectId(id)) notFound();
    await connectDB();
    const { model } = resourceOrThrow(resource);
    const found = await model.findById(id).lean();
    if (!found) notFound();
    doc = serialize<Record<string, unknown>>(found);
  }
  const title = isNew ? `New ${config.singular.toLowerCase()}` : String(getPath(doc, config.titleField) ?? config.singular);
  return (
    <>
      <Link href={`/admin/${config.key}`} className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" /> {config.label}</Link>
      <PageHeader eyebrow={config.singular} title={title} description={config.description} />
      <ResourceForm key={id} config={config} initial={doc} id={isNew ? undefined : id} />
    </>
  );
}
