import type { Metadata } from "next";
import { CmsPage } from "@/components/site/cms-page";
import { getPage } from "@/server/services/catalog.service";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("terms");
  return buildMetadata({ title: page?.title ?? "Terms & conditions", description: page?.intro, path: "/terms", seo: page?.seo });
}

export default async function Page() {
  const page = await getPage("terms");
  return <CmsPage crumb="Terms & conditions" title={page?.title ?? "Terms & conditions"} intro={page?.intro} body={page?.body ?? "This page is being prepared. Add it in Admin → Pages (slug: terms)."} />;
}
