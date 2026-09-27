import type { Paise } from "@/lib/money";
import { dayOfWeek, isWithin, nightsBetween, type ISODate } from "@/lib/dates";
import { finalizeQuote, line, type RawLine } from "./finalize";
import { addOnLines } from "./addons";
import {
  QuoteError,
  type AddOnSelection,
  type DiscountContext,
  type DiscountInput,
  type MealEligibility,
  type MealPlanInput,
  type PriceRule,
  type Quote,
  type TaxConfig,
} from "./types";

export interface PropertyPricingInput {
  id: string;
  name: string;
  pricing: { baseRate: Paise; weekendRate?: Paise; weekendDays: number[]; compareAtRate?: Paise };
  pricingSource: "local" | "channel";
  occupancy: { baseGuests: number; maxGuests: number; maxAdults: number; maxChildren: number };
  extraGuest: { enabled: boolean; adultPerNight: Paise; childPerNight: Paise };
  stayRules: { minNights: number; maxNights?: number };
}

export interface StayPackageInput {
  id: string;
  title: string;
  nights: number;
  pricingMode: "fixed_per_package" | "fixed_per_person" | "dynamic";
  price?: Paise;
  compareAtPrice?: Paise;
}

export interface StayQuoteInput {
  checkIn: ISODate;
  checkOut: ISODate;
  adults: number;
  children: number;
  childAges: number[];
  property: PropertyPricingInput;
  priceRules: PriceRule[];
  /** Nightly rates from the channel manager; required when property.pricingSource === "channel". */
  channelRates?: Record<ISODate, Paise>;
  mealPlan?: MealPlanInput;
  package?: StayPackageInput;
  addOns?: AddOnSelection[];
  discount?: DiscountInput;
  discountContext?: DiscountContext;
  tax: TaxConfig;
  today: ISODate;
}

export function isMealEligible(nights: number, rule: MealEligibility): boolean {
  return rule.comparison === "gte" ? nights >= rule.minNights : nights > rule.minNights;
}

function applyAdjustment(rate: Paise, adj: PriceRule["adjustment"]): Paise {
  switch (adj.type) {
    case "fixed_rate":
      return Math.round(adj.value);
    case "percent":
      return Math.round(rate * (1 + adj.value / 100));
    case "flat_delta":
      return rate + Math.round(adj.value);
  }
}

/**
 * Nightly rate resolution:
 *   base → weekend rate (on configured weekdays) → highest-priority season/festival rule → date override.
 * percent / flat_delta adjustments apply to the rate resolved so far.
 */
export function resolveNightlyRate(night: ISODate, p: PropertyPricingInput, rules: PriceRule[]): Paise {
  let rate =
    p.pricing.weekendRate != null && p.pricing.weekendDays.includes(dayOfWeek(night)) ? p.pricing.weekendRate : p.pricing.baseRate;

  const applicable = rules.filter(
    (r) =>
      r.active &&
      (r.propertyIds === "all" || r.propertyIds.includes(p.id)) &&
      r.dateRanges.some((d) => isWithin(night, d.from, d.to)),
  );
  const pick = (kinds: PriceRule["kind"][]) =>
    applicable.filter((r) => kinds.includes(r.kind)).sort((a, b) => b.priority - a.priority)[0];

  const seasonal = pick(["season", "festival"]);
  if (seasonal) rate = applyAdjustment(rate, seasonal.adjustment);
  const override = pick(["date_override"]);
  if (override) rate = applyAdjustment(rate, override.adjustment);
  return Math.max(0, rate);
}

function mealLines(plan: MealPlanInput, nights: number, adults: number, childAges: number[]): RawLine[] {
  if (plan.pricingModel === "per_booking_per_night") {
    return [line("meal", `${plan.name} · ${nights} nights`, nights, plan.adultPrice, "meal", { mealPlanId: plan.id })];
  }
  const adultRated = adults + childAges.filter((a) => a > plan.childAgeMax).length;
  const childRated = childAges.filter((a) => a >= plan.childAgeMin && a <= plan.childAgeMax).length;
  const out: RawLine[] = [];
  if (adultRated > 0)
    out.push(
      line("meal", `${plan.name} · ${adultRated} adult${adultRated > 1 ? "s" : ""} × ${nights} nights`, adultRated * nights, plan.adultPrice, "meal", {
        mealPlanId: plan.id,
        persons: adultRated,
        nights,
      }),
    );
  if (childRated > 0 && plan.childPrice > 0)
    out.push(
      line("meal", `${plan.name} · ${childRated} child${childRated > 1 ? "ren" : ""} × ${nights} nights`, childRated * nights, plan.childPrice, "meal", {
        mealPlanId: plan.id,
        persons: childRated,
        nights,
      }),
    );
  return out;
}

export function quoteStay(input: StayQuoteInput): Quote {
  const { property: p, adults, children, childAges, package: pkg } = input;
  const vertical = pkg ? "stay_food" : "stay";

  if (input.checkOut <= input.checkIn) throw new QuoteError("INVALID_DATES", "Check-out must be after check-in.");
  if (input.checkIn < input.today) throw new QuoteError("PAST_DATE", "Check-in date is in the past.");
  const nights = nightsBetween(input.checkIn, input.checkOut);
  const n = nights.length;

  if (pkg && n !== pkg.nights)
    throw new QuoteError("PACKAGE_NIGHTS_MISMATCH", `This package is for exactly ${pkg.nights} nights.`, { expected: pkg.nights });
  if (n < p.stayRules.minNights)
    throw new QuoteError("MIN_NIGHTS", `Minimum stay is ${p.stayRules.minNights} nights.`, { minNights: p.stayRules.minNights });
  if (p.stayRules.maxNights && n > p.stayRules.maxNights)
    throw new QuoteError("MAX_NIGHTS", `Maximum stay is ${p.stayRules.maxNights} nights.`, { maxNights: p.stayRules.maxNights });

  if (adults < 1) throw new QuoteError("OCCUPANCY", "At least one adult is required.");
  if (childAges.length !== children) throw new QuoteError("OCCUPANCY", "Please provide an age for each child.");
  if (adults + children > p.occupancy.maxGuests || adults > p.occupancy.maxAdults || children > p.occupancy.maxChildren)
    throw new QuoteError("OCCUPANCY", `${p.name} hosts up to ${p.occupancy.maxGuests} guests.`, { maxGuests: p.occupancy.maxGuests });

  if (input.mealPlan && !isMealEligible(n, input.mealPlan.eligibility)) {
    const e = input.mealPlan.eligibility;
    throw new QuoteError(
      "MEAL_NOT_ELIGIBLE",
      e.comparison === "gte"
        ? `Meal plans are available for stays of ${e.minNights} nights or more.`
        : `Meal plans are available for stays of more than ${e.minNights} nights.`,
      { ...e },
    );
  }

  const lines: RawLine[] = [];
  const persons = adults + children;
  let compareAtTotal: Paise | undefined;

  const fixedPackage = pkg && pkg.pricingMode !== "dynamic";
  if (fixedPackage) {
    if (pkg.price == null) throw new QuoteError("MISSING_RATE", "Package price is not configured.");
    if (pkg.pricingMode === "fixed_per_package")
      lines.push(line("package", `${pkg.title} · ${p.name}`, 1, pkg.price, "stay_food", { packageId: pkg.id, propertyId: p.id }));
    else lines.push(line("package", `${pkg.title} · ${persons} guests`, persons, pkg.price, "stay_food", { packageId: pkg.id }));
    if (pkg.compareAtPrice) compareAtTotal = pkg.pricingMode === "fixed_per_package" ? pkg.compareAtPrice : pkg.compareAtPrice * persons;
  } else {
    // Room nights, grouped by identical rate so the invoice stays readable.
    const rates = nights.map((night) => {
      if (p.pricingSource === "channel") {
        const r = input.channelRates?.[night];
        if (r == null) throw new QuoteError("MISSING_RATE", `No rate available for ${night}.`, { night });
        return r;
      }
      return resolveNightlyRate(night, p, input.priceRules);
    });
    const groups = new Map<Paise, ISODate[]>();
    rates.forEach((r, i) => groups.set(r, [...(groups.get(r) ?? []), nights[i]]));
    for (const [rate, ns] of groups)
      lines.push(line("room", `${p.name} · ${ns.length} night${ns.length > 1 ? "s" : ""}`, ns.length, rate, "accommodation", { propertyId: p.id, nights: ns }));

    // Extra guests above base occupancy: adults fill base places first.
    if (p.extraGuest.enabled) {
      const extraAdults = Math.max(0, adults - p.occupancy.baseGuests);
      const freeBase = Math.max(0, p.occupancy.baseGuests - adults);
      const extraChildren = Math.max(0, children - freeBase);
      if (extraAdults && p.extraGuest.adultPerNight)
        lines.push(line("extra_guest", `Extra adult × ${extraAdults} · ${n} nights`, extraAdults * n, p.extraGuest.adultPerNight, "accommodation"));
      if (extraChildren && p.extraGuest.childPerNight)
        lines.push(line("extra_guest", `Extra child × ${extraChildren} · ${n} nights`, extraChildren * n, p.extraGuest.childPerNight, "accommodation"));
    }

    if (input.mealPlan) lines.push(...mealLines(input.mealPlan, n, adults, childAges));
    if (p.pricing.compareAtRate && !pkg) compareAtTotal = p.pricing.compareAtRate * n;
  }

  // Strike-through compares like with like: replace the compared lines' value, keep everything else.
  if (compareAtTotal != null) {
    const comparedTypes = fixedPackage ? ["package"] : ["room"];
    const compared = lines.filter((l) => comparedTypes.includes(l.type)).reduce((s, l) => s + l.amount, 0);
    const others = lines.filter((l) => !comparedTypes.includes(l.type)).reduce((s, l) => s + l.amount, 0);
    compareAtTotal = compareAtTotal > compared ? compareAtTotal + others : undefined;
  }
  const addOns = addOnLines(input.addOns ?? [], persons, n);
  lines.push(...addOns);
  if (compareAtTotal != null) compareAtTotal += addOns.reduce((s, l) => s + l.amount, 0);

  return finalizeQuote({
    vertical,
    lines,
    tax: input.tax,
    discount: input.discount,
    discountContext: input.discountContext,
    scope: { vertical, propertyId: p.id, packageId: pkg?.id, nights: n, today: input.today },
    compareAtTotal,
    meta: { propertyId: p.id, checkIn: input.checkIn, checkOut: input.checkOut, nights: n, adults, children, mealPlanId: input.mealPlan?.id, packageId: pkg?.id },
  });
}
