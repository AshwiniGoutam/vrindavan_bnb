import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CheckoutClient } from "@/components/booking/checkout-client";
import { stayQuoteSchema, tourQuoteSchema } from "@/server/validation";
import { getPropertyBySlug, getTourBySlug, getPackageBySlug } from "@/server/services/catalog.service";
import { plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  let raw: unknown;
  try {
    raw = JSON.parse(sp.data ?? "");
  } catch {
    redirect("/stays");
  }

  if (sp.type === "darshan") {
    const parsed = tourQuoteSchema.safeParse(raw);
    if (!parsed.success) redirect("/darshan-tours");
    const data = await getTourBySlug(parsed.data.tourSlug);
    if (!data) redirect("/darshan-tours");
    const r = parsed.data;
    return (
      <CheckoutClient
        vertical="darshan"
        request={r}
        title={data.tour.title}
        subtitle={`${fmt(r.travelDate)} · ${plural(r.adults, "adult")}${r.children ? `, ${plural(r.children, "child", "children")}` : ""}`}
        backHref={`/darshan-tours/${data.tour.slug}#book`}
        pickupPoints={data.tour.pickupPoints}
        addOns={data.addOns}
        policySummary={data.policy?.summary}
      />
    );
  }

  const parsed = stayQuoteSchema.and(z.object({ specialRequests: z.string().max(1000).optional() })).safeParse(raw);
  if (!parsed.success) redirect("/stays");
  const r = parsed.data;
  const data = await getPropertyBySlug(r.propertySlug);
  if (!data) redirect("/stays");
  const pkg = r.packageSlug ? await getPackageBySlug(r.packageSlug) : null;
  const nights = Math.round((Date.parse(r.checkOut) - Date.parse(r.checkIn)) / 86_400_000);
  return (
    <CheckoutClient
      vertical="stay"
      request={r}
      title={pkg ? `${pkg.pkg.title} · ${data.property.name}` : data.property.name}
      subtitle={`${fmt(r.checkIn)} → ${fmt(r.checkOut)} · ${plural(nights, "night")} · ${plural(r.adults + r.children, "guest")}`}
      backHref={pkg ? `/stay-food/${pkg.pkg.slug}` : `/stays/${data.property.slug}`}
      policySummary={(pkg?.policy ?? data.policy)?.summary}
    />
  );
}
