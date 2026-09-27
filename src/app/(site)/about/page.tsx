import type { Metadata } from "next";
import Link from "next/link";
import { CmsPage } from "@/components/site/cms-page";
import { getPage } from "@/server/services/catalog.service";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("about");
  return buildMetadata({ title: page?.title ?? "About VHI", description: page?.intro ?? "The story behind VHI — Vrindavan Holiday Inn Luxury Homestays.", path: "/about", image: page?.heroImage });
}

export default async function AboutPage() {
  const page = await getPage("about");
  return (
    <CmsPage
      crumb="About"
      title={page?.title ?? "About VHI"}
      intro={page?.intro ?? "VHI — Vrindavan Holiday Inn — is a small collection of private homes in Vrindavan, run by a local family."}
      body={page?.body ?? "We started VHI because pilgrims deserved a better place to come home to after darshan: clean, private, calm, and cared for by people who know Braj.\n\nToday we host families, couples and satsang groups across our homes — and help them plan everything from mangla aarti to Govardhan parikrama."}
      heroImage={page?.heroImage}
    >
      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/stays" className="btn btn-primary">Our stays</Link>
        <Link href="/contact" className="btn btn-outline">Get in touch</Link>
      </div>
    </CmsPage>
  );
}
