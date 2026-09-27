import type { Metadata } from "next";
import { CmsPage } from "@/components/site/cms-page";
import { getPage } from "@/server/services/catalog.service";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("privacy-policy");
  return buildMetadata({ title: page?.title ?? "Privacy policy", description: page?.intro, path: "/privacy-policy", seo: page?.seo });
}

export default async function Page() {
  const page = await getPage("privacy-policy");
  return <CmsPage crumb="Privacy policy" title={page?.title ?? "Privacy policy"} intro={page?.intro} body={page?.body ?? "This page is being prepared. Add it in Admin → Pages (slug: privacy-policy)."} />;
}
