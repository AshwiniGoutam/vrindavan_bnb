import "server-only";
import { diffDays, todayIST, type ISODate } from "@/lib/dates";
import { connectDB } from "@/server/db/connect";
import { AddOn, Coupon, CouponRedemption, Customer, DarshanTour, MealPlan, Offer, PriceRule, Property, StayPackage, TourDeparture } from "@/server/models";
import { AppError } from "@/server/errors";
import { serialize, type AddOnDTO, type MealPlanDTO, type PackageDTO, type PropertyDTO, type TourDTO } from "@/server/types";
import { getSettings, taxConfigFrom } from "./settings.service";
import {
  quoteStay, quoteTour, QuoteError,
  type AddOnSelection, type DiscountContext, type DiscountInput, type PriceRule as EnginePriceRule, type Quote, type Vertical,
} from "./pricing";
import { channelManager } from "@/lib/integrations/channel-manager";
import { channelRef } from "./availability.service";

export interface AddOnRequest {
  id: string;
  qty: number;
}

export interface StayQuoteRequest {
  propertySlug: string;
  packageSlug?: string;
  checkIn: ISODate;
  checkOut: ISODate;
  adults: number;
  children: number;
  childAges: number[];
  mealPlanId?: string;
  addOns: AddOnRequest[];
  couponCode?: string;
  phone?: string;
}

export interface TourQuoteRequest {
  tourSlug: string;
  travelDate: ISODate;
  adults: number;
  children: number;
  childAges: number[];
  addOns: AddOnRequest[];
  couponCode?: string;
  phone?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any;

const toDiscountInput = (d: Doc, kind: "auto_offer" | "coupon"): DiscountInput => ({
  id: String(d._id),
  kind,
  code: d.code,
  name: d.title || d.name,
  type: d.type,
  value: d.value,
  maxDiscount: d.maxDiscount ?? undefined,
  minAmount: d.minAmount ?? undefined,
  minNights: d.minNights ?? undefined,
  verticals: d.verticals ?? [],
  propertyIds: (d.propertyIds ?? []).map(String),
  tourIds: (d.tourIds ?? []).map(String),
  packageIds: (d.packageIds ?? []).map(String),
  startsAt: d.startsAt ?? undefined,
  endsAt: d.endsAt ?? undefined,
  active: !!d.active,
  firstBookingOnly: !!d.firstBookingOnly,
  appliesToAddOns: !!d.appliesToAddOns,
  showStrikeThrough: d.showStrikeThrough ?? false,
});

async function discountContext(coupon: Doc | null, phone?: string): Promise<DiscountContext> {
  const customer = phone ? await Customer.findOne({ phone }).lean<{ bookingsCount: number }>() : null;
  const isFirstBooking = !customer || (customer.bookingsCount ?? 0) === 0;
  let perCustomerLimitReached = false;
  if (coupon && phone && coupon.perCustomerLimit) {
    const used = await CouponRedemption.countDocuments({ couponId: coupon._id, phone, status: { $in: ["reserved", "used"] } });
    perCustomerLimitReached = used >= coupon.perCustomerLimit;
  }
  return {
    isFirstBooking,
    usageLimitReached: !!(coupon && coupon.usageLimit && coupon.usedCount >= coupon.usageLimit),
    perCustomerLimitReached,
  };
}

/** Runs the engine with: the coupon if one was entered, otherwise the best applicable automatic offer. */
async function withBestDiscount(vertical: Vertical, couponCode: string | undefined, phone: string | undefined, run: (d?: DiscountInput, ctx?: DiscountContext) => Quote) {
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() }).lean<Doc>();
    if (!coupon) {
      const q = run();
      return { quote: { ...q, discountRejected: "That coupon code isn't valid." }, discountKind: null as null | "offer" | "coupon" };
    }
    const q = run(toDiscountInput(coupon, "coupon"), await discountContext(coupon, phone));
    return { quote: q, discountKind: q.discountTotal > 0 ? ("coupon" as const) : null };
  }
  const today = todayIST();
  const offers = await Offer.find({
    active: true,
    verticals: vertical,
    $and: [{ $or: [{ startsAt: null }, { startsAt: { $lte: today } }] }, { $or: [{ endsAt: null }, { endsAt: { $gte: today } }] }],
  }).lean<Doc[]>();
  let best = run();
  let kind: null | "offer" = null;
  if (offers.length) {
    const ctx = await discountContext(null, phone);
    for (const o of offers) {
      const q = run(toDiscountInput(o, "auto_offer"), ctx);
      if (q.discountTotal > 0 && q.total < best.total) {
        best = { ...q, discountRejected: undefined };
        kind = "offer";
      }
    }
  }
  return { quote: best, discountKind: kind };
}

function engineRules(rules: Doc[]): EnginePriceRule[] {
  return rules.map((r) => ({
    id: String(r._id),
    kind: r.kind,
    propertyIds: r.appliesToAll ? "all" : (r.propertyIds ?? []).map(String),
    dateRanges: [{ from: r.from, to: r.to }],
    adjustment: { type: r.adjustmentType, value: r.adjustmentValue },
    priority: r.priority ?? 0,
    active: !!r.active,
  }));
}

function addOnSelections(requested: AddOnRequest[], docs: AddOnDTO[]): AddOnSelection[] {
  const out: AddOnSelection[] = [];
  for (const r of requested) {
    const a = docs.find((d) => d._id === r.id);
    if (a) out.push({ addOn: { id: a._id, name: a.name, pricingUnit: a.pricingUnit, price: a.price, maxQty: a.maxQty }, qty: Math.max(0, Math.floor(r.qty)) });
  }
  return out;
}

export async function quoteStayRequest(req: StayQuoteRequest) {
  await connectDB();
  const settings = await getSettings();
  const today = todayIST();
  const property = serialize<PropertyDTO | null>(await Property.findOne({ slug: req.propertySlug, "publishing.status": "published" }).lean());
  if (!property) throw new AppError("NOT_FOUND", "This stay isn't available.", 404);
  if (property.status !== "active") throw new AppError("NOT_AVAILABLE", property.status === "maintenance" ? "This stay is temporarily closed for maintenance." : "This stay isn't available.", 409);
  if (diffDays(today, req.checkIn) > settings.booking.maxAdvanceDays) throw new AppError("TOO_FAR", `Bookings open ${settings.booking.maxAdvanceDays} days ahead.`);

  const pkg = req.packageSlug ? serialize<PackageDTO | null>(await StayPackage.findOne({ slug: req.packageSlug, "publishing.status": "published" }).lean()) : null;
  if (req.packageSlug && !pkg) throw new AppError("NOT_FOUND", "This package isn't available.", 404);
  if (pkg?.propertyIds?.length && !pkg.propertyIds.includes(property._id)) throw new AppError("NOT_ELIGIBLE", "This stay isn't part of the selected package.");

  const [rulesDocs, mealPlan, addOnDocs] = await Promise.all([
    PriceRule.find({ active: true, from: { $lte: req.checkOut }, to: { $gte: req.checkIn } }).lean<Doc[]>(),
    req.mealPlanId ? MealPlan.findOne({ _id: req.mealPlanId, active: true }).lean() : null,
    req.addOns.length ? AddOn.find({ _id: { $in: req.addOns.map((a) => a.id) }, active: true }).lean() : [],
  ]);
  const meal = serialize<MealPlanDTO | null>(mealPlan);
  if (req.mealPlanId && !meal) throw new AppError("NOT_FOUND", "That meal plan isn't available.");
  const addOns = serialize<AddOnDTO[]>(addOnDocs);

  let channelRates: Record<string, number> | undefined;
  if (property.pricingSource === "channel") {
    const rates = await channelManager().getRates({ refs: [channelRef(property)], from: req.checkIn, to: req.checkOut });
    channelRates = rates[property._id];
  }

  const tax = taxConfigFrom(settings);
  const vertical: Vertical = pkg ? "stay_food" : "stay";
  try {
    const result = await withBestDiscount(vertical, req.couponCode, req.phone, (discount, discountContext) =>
      quoteStay({
        checkIn: req.checkIn,
        checkOut: req.checkOut,
        adults: req.adults,
        children: req.children,
        childAges: req.childAges,
        property: {
          id: property._id,
          name: property.name,
          pricing: property.pricing,
          pricingSource: property.pricingSource,
          occupancy: property.occupancy,
          extraGuest: property.extraGuest ?? { enabled: false, adultPerNight: 0, childPerNight: 0 },
          stayRules: property.stayRules,
        },
        priceRules: engineRules(rulesDocs),
        channelRates,
        mealPlan: meal
          ? {
              id: meal._id,
              name: meal.name,
              pricingModel: meal.pricingModel,
              adultPrice: meal.adultPrice,
              childPrice: meal.childPrice,
              childAgeMin: meal.childAgeMin,
              childAgeMax: meal.childAgeMax,
              eligibility: { minNights: meal.minNights, comparison: meal.nightsRule },
            }
          : undefined,
        package: pkg ? { id: pkg._id, title: pkg.title, nights: pkg.nights, pricingMode: pkg.pricingMode, price: pkg.price, compareAtPrice: pkg.compareAtPrice } : undefined,
        addOns: addOnSelections(req.addOns, addOns),
        discount,
        discountContext,
        tax,
        today,
      }),
    );
    return { ...result, property, pkg, meal, addOns, settings };
  } catch (e) {
    if (e instanceof QuoteError) throw new AppError(e.code, e.message, 422, e.details);
    throw e;
  }
}

export async function quoteTourRequest(req: TourQuoteRequest) {
  await connectDB();
  const settings = await getSettings();
  const today = todayIST();
  const tour = serialize<TourDTO | null>(await DarshanTour.findOne({ slug: req.tourSlug, "publishing.status": "published" }).lean());
  if (!tour) throw new AppError("NOT_FOUND", "This journey isn't available.", 404);

  const [departureDoc, addOnDocs] = await Promise.all([
    TourDeparture.findOne({ tourId: tour._id, date: req.travelDate }).lean<Doc>(),
    req.addOns.length ? AddOn.find({ _id: { $in: req.addOns.map((a) => a.id) }, active: true }).lean() : [],
  ]);
  const addOns = serialize<AddOnDTO[]>(addOnDocs);
  const departure = departureDoc
    ? { date: departureDoc.date, status: departureDoc.status, capacity: departureDoc.capacity, booked: departureDoc.booked, priceOverride: departureDoc.priceOverride ?? undefined }
    : tour.dailyCapacity
      ? { date: req.travelDate, status: "open" as const, capacity: tour.dailyCapacity, booked: 0 }
      : undefined;

  const tax = taxConfigFrom(settings);
  try {
    const result = await withBestDiscount("darshan", req.couponCode, req.phone, (discount, discountContext) =>
      quoteTour({
        tour: {
          id: tour._id,
          title: tour.title,
          bookingMode: tour.bookingMode,
          pricing: { ...tour.pricing, groupTiers: tour.pricing.groupTiers ?? [] },
          group: { min: tour.minGroupSize ?? settings.booking.defaultMinGroupSize, max: tour.maxGroupSize ?? undefined, childrenCountTowardMinimum: tour.childrenCountTowardMinimum ?? true },
          advanceDays: tour.advanceDays ?? settings.booking.defaultAdvanceDays,
          dateMode: tour.dateMode,
          blackoutDates: tour.blackoutDates ?? [],
        },
        travelDate: req.travelDate,
        adults: req.adults,
        children: req.children,
        childAges: req.childAges,
        departure,
        addOns: addOnSelections(req.addOns, addOns),
        discount,
        discountContext,
        tax,
        today,
      }),
    );
    return { ...result, tour, addOns, settings };
  } catch (e) {
    if (e instanceof QuoteError) throw new AppError(e.code, e.message, 422, e.details);
    throw e;
  }
}
