import "server-only";
import { connectDB, isDbConfigured } from "@/server/db/connect";
import {
  AddOn, Amenity, Banner, CancellationPolicy, DarshanTour, Experience, Faq, Itinerary, MealPlan, Offer, Page, Property, Reel, StayPackage, Testimonial,
} from "@/server/models";
import {
  serialize, type AddOnDTO, type AmenityDTO, type ItineraryDTO, type MealPlanDTO, type OfferDTO, type PackageDTO, type PolicyDTO, type PropertyDTO, type TestimonialDTO, type TourDTO,
} from "@/server/types";
import type { MediaRef } from "@/lib/media";
import { todayIST } from "@/lib/dates";

const PUBLISHED = { "publishing.status": "published" };

/** Every public query goes through here; returns empty results if the DB is unavailable so pages still render. */
async function safe<T>(fallback: T, fn: () => Promise<T>): Promise<T> {
  if (!isDbConfigured()) return fallback;
  try {
    await connectDB();
    return await fn();
  } catch (e) {
    console.error("[catalog]", e);
    return fallback;
  }
}

/* ── Stays ─────────────────────────────────────────── */

export interface StayFilters {
  type?: string;
  guests?: number;
  bedrooms?: number;
  maxPrice?: number; // paise
  amenity?: string;
  sort?: "featured" | "price_asc" | "price_desc";
}

export function listProperties(filters: StayFilters = {}) {
  return safe<PropertyDTO[]>([], async () => {
    const q: Record<string, unknown> = { ...PUBLISHED, status: { $ne: "inactive" } };
    if (filters.type) q.type = filters.type;
    if (filters.guests) q["occupancy.maxGuests"] = { $gte: filters.guests };
    if (filters.bedrooms) q.bedrooms = { $gte: filters.bedrooms };
    if (filters.maxPrice) q["pricing.baseRate"] = { $lte: filters.maxPrice };
    if (filters.amenity) q.amenityIds = filters.amenity;
    const sort: Record<string, 1 | -1> =
      filters.sort === "price_asc" ? { "pricing.baseRate": 1 } : filters.sort === "price_desc" ? { "pricing.baseRate": -1 } : { featured: -1, sortOrder: 1, name: 1 };
    return serialize<PropertyDTO[]>(await Property.find(q).sort(sort).lean());
  });
}

export const listFeaturedProperties = (limit = 6) =>
  safe<PropertyDTO[]>([], async () =>
    serialize(await Property.find({ ...PUBLISHED, status: { $ne: "inactive" } }).sort({ featured: -1, sortOrder: 1 }).limit(limit).lean()),
  );

export async function getPropertyBySlug(slug: string) {
  return safe<{ property: PropertyDTO; mealPlans: MealPlanDTO[]; addOns: AddOnDTO[]; policy: PolicyDTO | null; testimonials: TestimonialDTO[]; similar: PropertyDTO[] } | null>(
    null,
    async () => {
      const property = serialize<PropertyDTO | null>(await Property.findOne({ slug, ...PUBLISHED, status: { $ne: "inactive" } }).select("-location.exactAddress").lean());
      if (!property) return null;
      const [amenities, mealPlans, addOns, policy, testimonials, similar] = await Promise.all([
        Amenity.find({ _id: { $in: property.amenityIds ?? [] } }).sort({ group: 1, sortOrder: 1 }).lean(),
        MealPlan.find({ active: true, ...(property.mealPlanIds?.length ? { _id: { $in: property.mealPlanIds } } : {}) }).sort({ sortOrder: 1 }).lean(),
        AddOn.find({ active: true, appliesTo: "stay", ...(property.addOnIds?.length ? { _id: { $in: property.addOnIds } } : {}) }).sort({ sortOrder: 1 }).lean(),
        property.cancellationPolicyId
          ? CancellationPolicy.findById(property.cancellationPolicyId).lean()
          : CancellationPolicy.findOne({ vertical: "stay", isDefault: true }).lean(),
        Testimonial.find({ ...PUBLISHED, $or: [{ propertyId: property._id }, { vertical: "stay" }] }).sort({ sortOrder: 1 }).limit(6).lean(),
        Property.find({ ...PUBLISHED, status: { $ne: "inactive" }, _id: { $ne: property._id } }).sort({ featured: -1, sortOrder: 1 }).limit(3).lean(),
      ]);
      return {
        property: { ...property, amenities: serialize<AmenityDTO[]>(amenities) },
        mealPlans: serialize<MealPlanDTO[]>(mealPlans),
        addOns: serialize<AddOnDTO[]>(addOns),
        policy: serialize<PolicyDTO | null>(policy),
        testimonials: serialize<TestimonialDTO[]>(testimonials),
        similar: serialize<PropertyDTO[]>(similar),
      };
    },
  );
}

export const listAmenities = () => safe<AmenityDTO[]>([], async () => serialize(await Amenity.find().sort({ group: 1, sortOrder: 1 }).lean()));

/* ── Darshan tours ─────────────────────────────────── */

export const listTours = () =>
  safe<TourDTO[]>([], async () => serialize(await DarshanTour.find(PUBLISHED).sort({ featured: -1, sortOrder: 1, nights: 1 }).lean()));

export async function getTourBySlug(slug: string) {
  return safe<{ tour: TourDTO; related: TourDTO[]; addOns: AddOnDTO[]; policy: PolicyDTO | null; testimonials: TestimonialDTO[] } | null>(null, async () => {
    const tour = serialize<TourDTO | null>(await DarshanTour.findOne({ slug, ...PUBLISHED }).lean());
    if (!tour) return null;
    const [related, addOns, policy, testimonials] = await Promise.all([
      DarshanTour.find({ ...PUBLISHED, _id: { $ne: tour._id }, ...(tour.relatedTourIds?.length ? { _id: { $in: tour.relatedTourIds } } : {}) })
        .sort({ sortOrder: 1 })
        .limit(3)
        .lean(),
      AddOn.find({ active: true, appliesTo: "darshan", ...(tour.addOnIds?.length ? { _id: { $in: tour.addOnIds } } : {}) }).sort({ sortOrder: 1 }).lean(),
      tour.cancellationPolicyId ? CancellationPolicy.findById(tour.cancellationPolicyId).lean() : CancellationPolicy.findOne({ vertical: "darshan", isDefault: true }).lean(),
      Testimonial.find({ ...PUBLISHED, $or: [{ tourId: tour._id }, { vertical: "darshan" }] }).sort({ sortOrder: 1 }).limit(3).lean(),
    ]);
    return {
      tour,
      related: serialize<TourDTO[]>(related),
      addOns: serialize<AddOnDTO[]>(addOns),
      policy: serialize<PolicyDTO | null>(policy),
      testimonials: serialize<TestimonialDTO[]>(testimonials),
    };
  });
}

/* ── Stay + Food ───────────────────────────────────── */

export const listPackages = () =>
  safe<PackageDTO[]>([], async () => serialize(await StayPackage.find(PUBLISHED).sort({ featured: -1, sortOrder: 1, nights: 1 }).lean()));

export async function getPackageBySlug(slug: string) {
  return safe<{ pkg: PackageDTO; properties: PropertyDTO[]; mealPlans: MealPlanDTO[]; itinerary: ItineraryDTO | null; addOns: AddOnDTO[]; policy: PolicyDTO | null; others: PackageDTO[] } | null>(
    null,
    async () => {
      const pkg = serialize<PackageDTO | null>(await StayPackage.findOne({ slug, ...PUBLISHED }).lean());
      if (!pkg) return null;
      const [properties, mealPlans, itinerary, addOns, policy, others] = await Promise.all([
        Property.find({ ...PUBLISHED, status: "active", ...(pkg.propertyIds?.length ? { _id: { $in: pkg.propertyIds } } : {}) }).sort({ sortOrder: 1 }).lean(),
        MealPlan.find({ active: true, ...(pkg.mealPlanIds?.length ? { _id: { $in: pkg.mealPlanIds } } : {}) }).sort({ sortOrder: 1 }).lean(),
        pkg.itineraryId ? Itinerary.findById(pkg.itineraryId).lean() : null,
        AddOn.find({ active: true, appliesTo: "stay_food" }).sort({ sortOrder: 1 }).lean(),
        pkg.cancellationPolicyId ? CancellationPolicy.findById(pkg.cancellationPolicyId).lean() : CancellationPolicy.findOne({ vertical: "stay_food", isDefault: true }).lean(),
        StayPackage.find({ ...PUBLISHED, _id: { $ne: pkg._id } }).sort({ nights: 1 }).lean(),
      ]);
      return {
        pkg,
        properties: serialize<PropertyDTO[]>(properties),
        mealPlans: serialize<MealPlanDTO[]>(mealPlans),
        itinerary: serialize<ItineraryDTO | null>(itinerary),
        addOns: serialize<AddOnDTO[]>(addOns),
        policy: serialize<PolicyDTO | null>(policy),
        others: serialize<PackageDTO[]>(others),
      };
    },
  );
}

/* ── Shared content ────────────────────────────────── */

export const listMealPlans = () => safe<MealPlanDTO[]>([], async () => serialize(await MealPlan.find({ active: true }).sort({ sortOrder: 1 }).lean()));

export const listAddOns = (vertical?: "stay" | "stay_food" | "darshan") =>
  safe<AddOnDTO[]>([], async () => serialize(await AddOn.find({ active: true, ...(vertical ? { appliesTo: vertical } : {}) }).sort({ sortOrder: 1 }).lean()));

export const listTestimonials = (limit = 6) =>
  safe<TestimonialDTO[]>([], async () => serialize(await Testimonial.find(PUBLISHED).sort({ sortOrder: 1, createdAt: -1 }).limit(limit).lean()));

export const listFaqs = (opts: { category?: string; homepage?: boolean } = {}) =>
  safe<{ _id: string; question: string; answer: string; category: string }[]>([], async () =>
    serialize(
      await Faq.find({ ...PUBLISHED, ...(opts.category ? { category: opts.category } : {}), ...(opts.homepage ? { showOnHomepage: true } : {}) })
        .sort({ category: 1, sortOrder: 1 })
        .lean(),
    ),
  );

export const listExperiences = () =>
  safe<{ _id: string; title: string; category?: string; description?: string; bestTime?: string; image?: MediaRef }[]>([], async () =>
    serialize(await Experience.find(PUBLISHED).sort({ sortOrder: 1 }).limit(8).lean()),
  );

  export interface BannerDTO {
  _id: string;
  eyebrow?: string;
  title: string;
  titleAccent?: string;
  subtitle?: string;
  textTone?: "dark" | "light";
  image?: MediaRef;
  mobileImage?: MediaRef;
  video?: MediaRef;
  ctaLabel?: string;
  ctaHref?: string;
}

export const listBanners = (placement: string) =>
  safe<BannerDTO[]>(
    [],
    async () => serialize(await Banner.find({ ...PUBLISHED, placement }).sort({ sortOrder: 1 }).lean()),
  );

export const listReels = () =>
  safe<{ _id: string; title?: string; label?: string; instagramUrl?: string; thumbnail?: MediaRef; video?: MediaRef }[]>([], async () =>
    serialize(await Reel.find(PUBLISHED).sort({ sortOrder: 1 }).limit(8).lean()),
  );

export const listHomepageOffers = () =>
  safe<OfferDTO[]>([], async () => {
    const today = todayIST();
    return serialize(
      await Offer.find({
        active: true,
        showOnHomepage: true,
        $and: [{ $or: [{ startsAt: null }, { startsAt: { $lte: today } }] }, { $or: [{ endsAt: null }, { endsAt: { $gte: today } }] }],
      })
        .sort({ priority: -1 })
        .limit(3)
        .lean(),
    );
  });

export const getPage = (slug: string) =>
  safe<{ title: string; intro?: string; body?: string; heroImage?: MediaRef; seo?: Record<string, string> } | null>(null, async () =>
    serialize(await Page.findOne({ slug, ...PUBLISHED }).lean()),
  );

export const listPolicies = () =>
  safe<PolicyDTO[]>([], async () => serialize(await CancellationPolicy.find({ isDefault: true }).sort({ vertical: 1 }).lean()));

/** For sitemap.xml */
export const listSlugs = () =>
  safe<{ stays: string[]; tours: string[]; packages: string[] }>({ stays: [], tours: [], packages: [] }, async () => {
    const [s, t, p] = await Promise.all([
      Property.find({ ...PUBLISHED, status: { $ne: "inactive" } }).select("slug").lean<{ slug: string }[]>(),
      DarshanTour.find(PUBLISHED).select("slug").lean<{ slug: string }[]>(),
      StayPackage.find(PUBLISHED).select("slug").lean<{ slug: string }[]>(),
    ]);
    return { stays: s.map((x) => x.slug), tours: t.map((x) => x.slug), packages: p.map((x) => x.slug) };
  });
