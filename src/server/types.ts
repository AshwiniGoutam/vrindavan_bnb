/**
 * Serialisable DTOs passed from server components to client components.
 * `serialize()` turns Mongoose lean docs (ObjectId, Date) into plain JSON.
 */
import type { MediaRef } from "@/lib/media";

export const serialize = <T>(doc: unknown): T => JSON.parse(JSON.stringify(doc ?? null));

export interface FaqItem {
  question: string;
  answer: string;
}
export interface Publishing {
  status: "draft" | "published" | "unpublished";
}
export interface Seo {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: MediaRef;
  canonicalUrl?: string;
  noIndex?: boolean;
}

export interface AmenityDTO {
  _id: string;
  name: string;
  icon?: string;
  group?: string;
}

export interface PropertyDTO {
  _id: string;
  name: string;
  slug: string;
  type: string;
  label?: string;
  tagline?: string;
  shortDescription?: string;
  description?: string;
  highlights?: string[];
  collections?: string[];
  bedrooms: number;
  bathrooms: number;
  beds?: { room: string; bedType: string }[];
  occupancy: { baseGuests: number; maxGuests: number; maxAdults: number; maxChildren: number };
  extraGuest?: { enabled: boolean; adultPerNight: number; childPerNight: number };
  amenityIds?: string[];
  amenities?: AmenityDTO[];
  houseRules?: string[];
  checkInTime?: string;
  checkOutTime?: string;
  stayRules: { minNights: number; maxNights?: number };
  location?: { area?: string; city?: string; mapUrl?: string; lat?: number; lng?: number; nearby?: { name: string; distance: string }[] };
  featuredImage?: MediaRef;
  gallery?: MediaRef[];
  photoTour?: { name: string; highlights?: string[] }[];
  pricing: { baseRate: number; weekendRate?: number; weekendDays: number[]; compareAtRate?: number };
  pricingSource: "local" | "channel";
  channel?: { externalPropertyId?: string; externalRoomTypeId?: string; externalRatePlanId?: string };
  status: "active" | "maintenance" | "inactive";
  maintenanceNote?: string;
  featured?: boolean;
  mealPlanIds?: string[];
  addOnIds?: string[];
  cancellationPolicyId?: string;
  faqs?: FaqItem[];
  seo?: Seo;
}

export interface MealPlanDTO {
  _id: string;
  name: string;
  code: string;
  description?: string;
  servingInfo?: string;
  timings?: string;
  pricingModel: "per_person_per_night" | "per_booking_per_night";
  adultPrice: number;
  childPrice: number;
  childAgeMin: number;
  childAgeMax: number;
  minNights: number;
  nightsRule: "gte" | "gt";
  image?: MediaRef;
}

export interface AddOnDTO {
  _id: string;
  name: string;
  code: string;
  category: string;
  description?: string;
  icon?: string;
  pricingUnit: "per_trip" | "per_day" | "per_person" | "per_booking" | "on_request";
  price: number;
  maxQty?: number;
  appliesTo?: string[];
}

export interface TourDay {
  day: number;
  title: string;
  summary?: string;
  items?: string[];
  image?: MediaRef;
}

export interface TourDTO {
  _id: string;
  title: string;
  slug: string;
  durationLabel?: string;
  nights?: number;
  days?: number;
  eyebrow?: string;
  subtitle?: string;
  overview?: string;
  heroImage?: MediaRef;
  gallery?: MediaRef[];
  bookingMode: "online" | "enquiry" | "both";
  pricing: { adultPrice: number; childPrice?: number; childAgeMax?: number; compareAtPrice?: number; priceBasisNote?: string; groupTiers?: { minPeople: number; maxPeople: number; adultPrice: number }[] };
  minGroupSize: number;
  maxGroupSize?: number;
  childrenCountTowardMinimum: boolean;
  advanceDays: number;
  dateMode: "any_date" | "fixed_dates";
  dailyCapacity?: number;
  blackoutDates?: string[];
  highlights?: string[];
  itinerary?: TourDay[];
  stayInfo?: string;
  stayPropertyIds?: string[];
  stayAllocation?: "auto" | "manual";
  mealInfo?: string;
  inclusions?: string[];
  exclusions?: string[];
  pickupInfo?: string;
  pickupPoints?: string[];
  vehicleInfo?: string;
  travelFacts?: { label: string; value: string }[];
  importantInfo?: string[];
  faqs?: FaqItem[];
  relatedTourIds?: string[];
  addOnIds?: string[];
  cancellationPolicyId?: string;
  seo?: Seo;
}

export interface ItineraryDTO {
  _id: string;
  title: string;
  nights?: number;
  summary?: string;
  days?: TourDay[];
  pdf?: MediaRef;
  printedCopyIncluded?: boolean;
}

export interface PackageDTO {
  _id: string;
  title: string;
  slug: string;
  nights: number;
  tagline?: string;
  description?: string;
  heroImage?: MediaRef;
  gallery?: MediaRef[];
  propertyIds?: string[];
  mealPlanIds?: string[];
  pricingMode: "dynamic" | "fixed_per_package" | "fixed_per_person";
  price?: number;
  compareAtPrice?: number;
  offerText?: string;
  inclusions?: string[];
  exclusions?: string[];
  itineraryId?: string;
  localRecommendations?: { title: string; description: string }[];
  cancellationPolicyId?: string;
  faqs?: FaqItem[];
  seo?: Seo;
}

export interface PolicyDTO {
  _id: string;
  name: string;
  vertical: "stay" | "stay_food" | "darshan";
  summary?: string;
  body?: string;
  rules?: { daysBeforeMin: number; refundPercent: number }[];
  nonRefundableLineTypes?: string[];
  fixedDeduction?: number;
  refundGst?: boolean;
}

export interface TestimonialDTO {
  _id: string;
  guestName: string;
  city?: string;
  image?: MediaRef;
  rating: number;
  text: string;
  stayedIn?: string;
}

export interface OfferDTO {
  _id: string;
  name: string;
  title?: string;
  description?: string;
  badgeText?: string;
  image?: MediaRef;
  type: "percent" | "flat";
  value: number;
  verticals: string[];
  endsAt?: string;
}

export interface SettingsDTO {
  business: {
    brandName: string;
    tagline: string;
    legalName?: string;
    gstin?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    address?: string;
    mapUrl?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    registeredAddress?: string;
    invoiceAddress?: string;
  };
  home: {
    heroEyebrow?: string;
    heroTitle?: string;
    heroAccent?: string;
    heroSubtitle?: string;
    heroImage?: MediaRef;
    introTitle?: string;
    introBody?: string;
    introImage?: MediaRef;
    foodTitle?: string;
    foodBody?: string;
    foodImage?: MediaRef;
    whyVhi?: { title: string; body: string }[];
  };
  tax: {
    accommodationRate: number;
    accommodationSlabLimit?: number;
    accommodationRateAboveSlab?: number;
    stayFoodRate: number;
    darshanRate: number;
    mealRate: number;
    addonRate: number;
    showPricesWithTax: boolean;
    invoicePrefix: string;
  };
  booking: { holdMinutes: number; maxAdvanceDays: number; defaultMinGroupSize: number; defaultAdvanceDays: number; defaultMealMinNights: number };
  notifications: {
    adminWhatsappNumbers: string[];
    adminEmails: string[];
    templateLanguage: string;
    guestConfirmationTemplate: string;
    adminBookingTemplate: string;
    adminEnquiryTemplate: string;
    guestCancellationTemplate: string;
    sendGuestWhatsapp: boolean;
    sendGuestEmail: boolean;
  };
  contacts: { name: string; role: string; phone: string; showToGuests?: boolean }[];
  seo?: { defaultTitle?: string; defaultDescription?: string; ogImage?: MediaRef };
}
