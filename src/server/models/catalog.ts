import { Schema } from "mongoose";
import { authored, defineModel, FaqItemSchema, isoDate, MediaRefSchema, paise, PropertyMediaSchema, PublishingSchema, SeoSchema, TourDaySchema, translations } from "./_shared";

const { ObjectId } = Schema.Types;

export const Amenity = defineModel(
  "Amenity",
  new Schema(
    { name: { type: String, required: true, trim: true }, icon: { type: String, default: "Check" }, group: { type: String, default: "Essentials" }, sortOrder: { type: Number, default: 0 } },
    { timestamps: true },
  ),
);

const PropertySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: { type: String, enum: ["studio", "1bhk", "2bhk", "3bhk", "4bhk", "villa"], required: true },
    label: String, // free-text badge (e.g. "ATT" on Braj Casa — meaning to be confirmed by client)
    tagline: String,
    shortDescription: String,
    description: String,
    highlights: [String],
    collections: [String],
    bedrooms: { type: Number, default: 1 },
    bathrooms: { type: Number, default: 1 },
    beds: [{ _id: false, room: String, bedType: String }],
    occupancy: {
      baseGuests: { type: Number, default: 2 },
      maxGuests: { type: Number, default: 2 },
      maxAdults: { type: Number, default: 2 },
      maxChildren: { type: Number, default: 0 },
    },
    extraGuest: { enabled: { type: Boolean, default: false }, adultPerNight: { ...paise, default: 0 }, childPerNight: { ...paise, default: 0 } },
    amenityIds: [{ type: ObjectId, ref: "Amenity" }],
    houseRules: [String],
    checkInTime: { type: String, default: "14:00" },
    checkOutTime: { type: String, default: "10:00" },
    stayRules: { minNights: { type: Number, default: 1 }, maxNights: { type: Number, default: 30 } },
    location: {
      area: String,
      city: { type: String, default: "Vrindavan" },
      mapUrl: String, // approximate area link (public)
      lat: Number,
      lng: Number,
      exactAddress: String, // private — shared after booking, never rendered publicly
      nearby: [{ _id: false, name: String, distance: String }],
    },
    featuredImage: MediaRefSchema,
    gallery: [PropertyMediaSchema],
    /** Photo tour: room order + amenity line per room (photos are tagged via gallery[].group) */
    photoTour: [{ _id: false, name: String, highlights: [String] }],
    pricing: {
      baseRate: { ...paise, default: 0 },
      weekendRate: paise,
      weekendDays: { type: [Number], default: [5, 6] },
      compareAtRate: paise,
    },
    pricingSource: { type: String, enum: ["local", "channel"], default: "local" },
    channel: { externalPropertyId: String, externalRoomTypeId: String, externalRatePlanId: String },
    status: { type: String, enum: ["active", "maintenance", "inactive"], default: "active" },
    maintenanceNote: String,
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    mealPlanIds: [{ type: ObjectId, ref: "MealPlan" }],
    addOnIds: [{ type: ObjectId, ref: "AddOn" }],
    cancellationPolicyId: { type: ObjectId, ref: "CancellationPolicy" },
    faqs: [FaqItemSchema],
    publishing: { type: PublishingSchema, default: () => ({}) },
    seo: { type: SeoSchema, default: () => ({}) },
    translations,
    ...authored,
  },
  { timestamps: true },
);
PropertySchema.index({ "publishing.status": 1, status: 1, featured: -1, sortOrder: 1 });
export const Property = defineModel("Property", PropertySchema);

/** Seasonal / festival / weekend-override / single-date pricing. */
const PriceRuleSchema = new Schema(
  {
    name: { type: String, required: true },
    kind: { type: String, enum: ["date_override", "season", "festival"], required: true },
    appliesToAll: { type: Boolean, default: true },
    propertyIds: [{ type: ObjectId, ref: "Property" }],
    from: { ...isoDate, required: true },
    to: { ...isoDate, required: true },
    adjustmentType: { type: String, enum: ["fixed_rate", "percent", "flat_delta"], required: true },
    adjustmentValue: { type: Number, required: true }, // paise for fixed/flat, % for percent
    priority: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    ...authored,
  },
  { timestamps: true },
);
PriceRuleSchema.index({ active: 1, from: 1, to: 1 });
export const PriceRule = defineModel("PriceRule", PriceRuleSchema);

/** Availability blocks for the manual provider (and maintenance windows). */
export const ManualBlock = defineModel(
  "ManualBlock",
  new Schema(
    {
      propertyId: { type: ObjectId, ref: "Property", required: true, index: true },
      from: { ...isoDate, required: true },
      to: { ...isoDate, required: true },
      reason: { type: String, enum: ["ota", "owner", "maintenance", "other"], default: "other" },
      note: String,
      ...authored,
    },
    { timestamps: true },
  ),
);

export const MealPlan = defineModel(
  "MealPlan",
  new Schema(
    {
      name: { type: String, required: true },
      code: { type: String, required: true, unique: true, uppercase: true },
      description: String,
      servingInfo: String,
      timings: String,
      pricingModel: { type: String, enum: ["per_person_per_night", "per_booking_per_night"], default: "per_person_per_night" },
      adultPrice: { ...paise, default: 0 },
      childPrice: { ...paise, default: 0 },
      childAgeMin: { type: Number, default: 5 },
      childAgeMax: { type: Number, default: 11 },
      minNights: { type: Number, default: 3 },
      nightsRule: { type: String, enum: ["gte", "gt"], default: "gte" }, // gte = "3 nights or more"
      image: MediaRefSchema,
      active: { type: Boolean, default: true },
      sortOrder: { type: Number, default: 0 },
      ...authored,
    },
    { timestamps: true },
  ),
);

/** Standalone itinerary (used by Stay + Food packages) with optional PDF. */
export const Itinerary = defineModel(
  "Itinerary",
  new Schema(
    {
      title: { type: String, required: true },
      nights: Number,
      summary: String,
      days: [TourDaySchema],
      pdf: MediaRefSchema,
      printedCopyIncluded: { type: Boolean, default: true },
      ...authored,
    },
    { timestamps: true },
  ),
);

/** Stay + Sattvik Food package (3 / 5 / 7 nights). */
export const StayPackage = defineModel(
  "StayPackage",
  new Schema(
    {
      title: { type: String, required: true },
      slug: { type: String, required: true, unique: true, lowercase: true },
      nights: { type: Number, required: true },
      tagline: String,
      description: String,
      heroImage: MediaRefSchema,
      gallery: [MediaRefSchema],
      propertyIds: [{ type: ObjectId, ref: "Property" }],
      mealPlanIds: [{ type: ObjectId, ref: "MealPlan" }],
      pricingMode: { type: String, enum: ["dynamic", "fixed_per_package", "fixed_per_person"], default: "dynamic" },
      price: paise,
      compareAtPrice: paise,
      offerText: String,
      inclusions: [String],
      exclusions: [String],
      itineraryId: { type: ObjectId, ref: "Itinerary" },
      localRecommendations: [{ _id: false, title: String, description: String }],
      cancellationPolicyId: { type: ObjectId, ref: "CancellationPolicy" },
      featured: { type: Boolean, default: false },
      sortOrder: { type: Number, default: 0 },
      faqs: [FaqItemSchema],
      publishing: { type: PublishingSchema, default: () => ({}) },
      seo: { type: SeoSchema, default: () => ({}) },
      translations,
      ...authored,
    },
    { timestamps: true },
  ),
);

export const DarshanTour = defineModel(
  "DarshanTour",
  new Schema(
    {
      title: { type: String, required: true },
      slug: { type: String, required: true, unique: true, lowercase: true },
      durationLabel: String,
      nights: Number,
      days: Number,
      eyebrow: String,
      subtitle: String,
      overview: String,
      heroImage: MediaRefSchema,
      gallery: [MediaRefSchema],
      bookingMode: { type: String, enum: ["online", "enquiry", "both"], default: "both" },
      pricing: {
        adultPrice: { ...paise, default: 0 },
        childPrice: paise,
        childAgeMax: Number,
        compareAtPrice: paise,
        priceBasisNote: String,
        groupTiers: [{ _id: false, minPeople: Number, maxPeople: Number, adultPrice: paise }],
      },
      minGroupSize: { type: Number, default: 4 },
      maxGroupSize: Number,
      childrenCountTowardMinimum: { type: Boolean, default: true },
      advanceDays: { type: Number, default: 15 },
      dateMode: { type: String, enum: ["any_date", "fixed_dates"], default: "any_date" },
      dailyCapacity: Number,
      blackoutDates: [String],
      highlights: [String],
      itinerary: [TourDaySchema],
      stayInfo: String,
      stayPropertyIds: [{ type: ObjectId, ref: "Property" }],
      stayAllocation: { type: String, enum: ["auto", "manual"], default: "manual" },
      mealInfo: String,
      inclusions: [String],
      exclusions: [String],
      pickupInfo: String,
      pickupPoints: [String],
      vehicleInfo: String,
      travelFacts: [{ _id: false, label: String, value: String }],
      importantInfo: [String],
      faqs: [FaqItemSchema],
      relatedTourIds: [{ type: ObjectId, ref: "DarshanTour" }],
      addOnIds: [{ type: ObjectId, ref: "AddOn" }],
      cancellationPolicyId: { type: ObjectId, ref: "CancellationPolicy" },
      featured: { type: Boolean, default: false },
      sortOrder: { type: Number, default: 0 },
      publishing: { type: PublishingSchema, default: () => ({}) },
      seo: { type: SeoSchema, default: () => ({}) },
      translations,
      ...authored,
    },
    { timestamps: true },
  ),
);

const TourDepartureSchema = new Schema(
  {
    tourId: { type: ObjectId, ref: "DarshanTour", required: true },
    date: { ...isoDate, required: true },
    capacity: { type: Number, required: true },
    booked: { type: Number, default: 0 },
    status: { type: String, enum: ["open", "closed", "sold_out"], default: "open" },
    priceOverride: paise,
  },
  { timestamps: true },
);
TourDepartureSchema.index({ tourId: 1, date: 1 }, { unique: true });
export const TourDeparture = defineModel("TourDeparture", TourDepartureSchema);

export const AddOn = defineModel(
  "AddOn",
  new Schema(
    {
      name: { type: String, required: true },
      code: { type: String, required: true, unique: true, uppercase: true },
      category: { type: String, enum: ["pickup", "drop", "scooty", "cab", "special", "other"], default: "other" },
      description: String,
      icon: { type: String, default: "Sparkles" },
      pricingUnit: { type: String, enum: ["per_trip", "per_day", "per_person", "per_booking", "on_request"], default: "per_trip" },
      price: { ...paise, default: 0 },
      maxQty: { type: Number, default: 10 },
      appliesTo: { type: [String], default: ["stay", "stay_food", "darshan"] },
      active: { type: Boolean, default: true },
      sortOrder: { type: Number, default: 0 },
      ...authored,
    },
    { timestamps: true },
  ),
);

export const CancellationPolicy = defineModel(
  "CancellationPolicy",
  new Schema(
    {
      name: { type: String, required: true },
      vertical: { type: String, enum: ["stay", "stay_food", "darshan"], required: true },
      summary: String,
      body: String,
      rules: [{ _id: false, daysBeforeMin: Number, refundPercent: Number }],
      nonRefundableLineTypes: { type: [String], default: ["addon"] },
      fixedDeduction: { ...paise, default: 0 },
      refundGst: { type: Boolean, default: true },
      isDefault: { type: Boolean, default: false },
      ...authored,
    },
    { timestamps: true },
  ),
);
