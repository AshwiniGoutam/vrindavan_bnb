import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { allocate, formatINR, rupeesToPaise as r } from "@/lib/money";
import { nightsBetween, todayIST } from "@/lib/dates";
import {
  quoteStay,
  quoteTour,
  resolveNightlyRate,
  tourDateStatus,
  QuoteError,
  type TaxConfig,
  type PropertyPricingInput,
  type MealPlanInput,
  type TourPricingInput,
  type DiscountInput,
} from "@/server/services/pricing";
import { calculateRefund } from "@/server/services/cancellation";

// Placeholder rates for tests only — real rates are entered in Admin after CA confirmation.
const tax: TaxConfig = {
  verticals: {
    accommodation: { rate: 12, slabs: [{ maxUnitPrice: r(7500), rate: 5 }, { maxUnitPrice: null, rate: 18 }] },
    stay_food: { rate: 5 },
    darshan: { rate: 5 },
    meal: { rate: 5 },
    addon: { rate: 18 },
  },
};

const leela: PropertyPricingInput = {
  id: "leela",
  name: "Leela Niwas",
  pricing: { baseRate: r(4500), weekendRate: r(5500), weekendDays: [5, 6], compareAtRate: r(6000) },
  pricingSource: "local",
  occupancy: { baseGuests: 4, maxGuests: 6, maxAdults: 6, maxChildren: 3 },
  extraGuest: { enabled: true, adultPerNight: r(800), childPerNight: r(400) },
  stayRules: { minNights: 1, maxNights: 14 },
};

const breakfast: MealPlanInput = {
  id: "bf",
  name: "Breakfast",
  pricingModel: "per_person_per_night",
  adultPrice: r(250),
  childPrice: r(150),
  childAgeMin: 5,
  childAgeMax: 11,
  eligibility: { minNights: 3, comparison: "gte" },
};

const TODAY = "2026-09-26";

describe("money & dates", () => {
  test("allocate sums exactly", () => {
    const parts = allocate(1000, [1, 1, 1]);
    assert.equal(parts.reduce((a, b) => a + b, 0), 1000);
    assert.deepEqual(parts, [334, 333, 333]);
  });
  test("formatINR", () => {
    assert.equal(formatINR(r(5999)), "₹5,999");
    assert.equal(formatINR(599950), "₹5,999.50");
  });
  test("nights and IST today", () => {
    assert.deepEqual(nightsBetween("2026-10-30", "2026-11-02"), ["2026-10-30", "2026-10-31", "2026-11-01"]);
    assert.equal(todayIST(new Date("2026-09-26T20:00:00Z")), "2026-09-27"); // 01:30 IST next day
  });
});

describe("nightly rate resolution", () => {
  test("weekend, festival and override precedence", () => {
    const rules = [
      { id: "holi", kind: "festival" as const, propertyIds: "all" as const, dateRanges: [{ from: "2027-03-20", to: "2027-03-23" }], adjustment: { type: "percent" as const, value: 40 }, priority: 10, active: true },
      { id: "ovr", kind: "date_override" as const, propertyIds: ["leela"], dateRanges: [{ from: "2027-03-22", to: "2027-03-22" }], adjustment: { type: "fixed_rate" as const, value: r(9999) }, priority: 1, active: true },
    ];
    assert.equal(resolveNightlyRate("2027-03-17", leela, rules), r(4500)); // Wed, base
    assert.equal(resolveNightlyRate("2027-03-19", leela, rules), r(5500)); // Fri, weekend
    assert.equal(resolveNightlyRate("2027-03-20", leela, rules), r(7700)); // Sat weekend +40%
    assert.equal(resolveNightlyRate("2027-03-22", leela, rules), r(9999)); // override wins
  });
});

describe("stay quote", () => {
  test("room lines grouped, GST slab by nightly rate, totals consistent", () => {
    const q = quoteStay({ checkIn: "2026-10-07", checkOut: "2026-10-10", adults: 2, children: 0, childAges: [], property: leela, priceRules: [], tax, today: TODAY });
    // Wed + Thu at 4500, Fri at 5500
    assert.equal(q.lines.length, 2);
    assert.equal(q.subtotal, r(14500));
    assert.equal(q.lines[0].gstRate, 5);
    assert.equal(q.total, q.taxableAmount + q.gstTotal);
    assert.equal(q.display.compareAtTotal, r(18000));
  });

  test("meals: 3 nights eligible under 'gte', 2 nights rejected, rule switchable to 'gt'", () => {
    const base = { adults: 2, children: 2, childAges: [3, 8], property: leela, priceRules: [], tax, today: TODAY };
    const q = quoteStay({ ...base, checkIn: "2026-10-05", checkOut: "2026-10-08", mealPlan: breakfast });
    const meals = q.lines.filter((l) => l.type === "meal");
    // 2 adults × 3 nights × 250 + 1 child (age 8) × 3 × 150; age 3 free
    assert.equal(meals.reduce((s, l) => s + l.amount, 0), r(1500) + r(450));

    assert.throws(() => quoteStay({ ...base, checkIn: "2026-10-05", checkOut: "2026-10-07", mealPlan: breakfast }), (e: QuoteError) => e.code === "MEAL_NOT_ELIGIBLE");
    const strict = { ...breakfast, eligibility: { minNights: 3, comparison: "gt" as const } };
    assert.throws(() => quoteStay({ ...base, checkIn: "2026-10-05", checkOut: "2026-10-08", mealPlan: strict }), (e: QuoteError) => e.code === "MEAL_NOT_ELIGIBLE");
  });

  test("extra guests and occupancy limit", () => {
    const q = quoteStay({ checkIn: "2026-10-05", checkOut: "2026-10-06", adults: 5, children: 1, childAges: [9], property: leela, priceRules: [], tax, today: TODAY });
    assert.ok(q.lines.some((l) => l.label.startsWith("Extra adult × 1")));
    assert.ok(q.lines.some((l) => l.label.startsWith("Extra child × 1")));
    assert.throws(() => quoteStay({ checkIn: "2026-10-05", checkOut: "2026-10-06", adults: 7, children: 0, childAges: [], property: leela, priceRules: [], tax, today: TODAY }), (e: QuoteError) => e.code === "OCCUPANCY");
  });

  test("Stay + Food fixed package must match its nights", () => {
    const pkg = { id: "p5", title: "5 Nights · Sattvik Stay", nights: 5, pricingMode: "fixed_per_package" as const, price: r(32000) };
    const q = quoteStay({ checkIn: "2026-10-05", checkOut: "2026-10-10", adults: 2, children: 0, childAges: [], property: leela, priceRules: [], package: pkg, tax, today: TODAY });
    assert.equal(q.vertical, "stay_food");
    assert.equal(q.subtotal, r(32000));
    assert.throws(() => quoteStay({ checkIn: "2026-10-05", checkOut: "2026-10-09", adults: 2, children: 0, childAges: [], property: leela, priceRules: [], package: pkg, tax, today: TODAY }), (e: QuoteError) => e.code === "PACKAGE_NIGHTS_MISMATCH");
  });

  test("coupon excludes add-ons by default and GST is on discounted amount", () => {
    const coupon: DiscountInput = { id: "c1", kind: "coupon", code: "RADHE10", name: "Radhe 10%", type: "percent", value: 10, verticals: ["stay"], active: true, firstBookingOnly: false };
    const cab = { addOn: { id: "cab", name: "Railway pickup", pricingUnit: "per_trip" as const, price: r(900) }, qty: 1 };
    const q = quoteStay({ checkIn: "2026-10-05", checkOut: "2026-10-07", adults: 2, children: 0, childAges: [], property: leela, priceRules: [], addOns: [cab], discount: coupon, tax, today: TODAY });
    assert.equal(q.discountTotal, r(900)); // 10% of 9000 rooms, not of the cab
    const addon = q.lines.find((l) => l.type === "addon")!;
    assert.equal(addon.discount, 0);
    assert.equal(q.total, q.subtotal - q.discountTotal + q.gstTotal);
  });

  test("rejected coupon returns a reason, not an error", () => {
    const coupon: DiscountInput = { id: "c2", kind: "coupon", code: "FIRST", name: "First stay", type: "flat", value: r(500), verticals: ["stay"], active: true, firstBookingOnly: true };
    const q = quoteStay({ checkIn: "2026-10-05", checkOut: "2026-10-06", adults: 2, children: 0, childAges: [], property: leela, priceRules: [], discount: coupon, discountContext: { isFirstBooking: false, usageLimitReached: false, perCustomerLimitReached: false }, tax, today: TODAY });
    assert.equal(q.discountTotal, 0);
    assert.match(q.discountRejected!, /first bookings/);
  });
});

describe("darshan tour quote", () => {
  const tour: TourPricingInput = {
    id: "t2",
    title: "Braj Darshan · 2 Nights / 3 Days",
    bookingMode: "both",
    pricing: { adultPrice: r(8999), childPrice: r(6999), childAgeMax: 11, groupTiers: [] },
    group: { min: 4, childrenCountTowardMinimum: true },
    advanceDays: 15,
    dateMode: "any_date",
    blackoutDates: [],
  };

  test("per-person pricing for a group of 4", () => {
    const q = quoteTour({ tour, travelDate: "2026-10-20", adults: 3, children: 1, childAges: [7], tax, today: TODAY });
    assert.equal(q.subtotal, r(8999) * 3 + r(6999));
    assert.equal(q.meta.people, 4);
  });

  test("15-day advance rule surfaces the WhatsApp message", () => {
    assert.equal(tourDateStatus(tour, "2026-10-10", TODAY), "advance_window"); // 14 days
    assert.equal(tourDateStatus(tour, "2026-10-11", TODAY), "available"); // 15 days
    assert.throws(() => quoteTour({ tour, travelDate: "2026-10-05", adults: 4, children: 0, childAges: [], tax, today: TODAY }), (e: QuoteError) => e.code === "ADVANCE_WINDOW" && /WhatsApp/.test(e.message));
  });

  test("minimum group, capacity and enquiry-only mode", () => {
    assert.throws(() => quoteTour({ tour, travelDate: "2026-10-20", adults: 3, children: 0, childAges: [], tax, today: TODAY }), (e: QuoteError) => e.code === "GROUP_SIZE");
    const departure = { date: "2026-10-20", status: "open" as const, capacity: 10, booked: 8 };
    assert.throws(() => quoteTour({ tour, travelDate: "2026-10-20", adults: 4, children: 0, childAges: [], departure, tax, today: TODAY }), (e: QuoteError) => e.code === "SOLD_OUT");
    assert.throws(() => quoteTour({ tour: { ...tour, bookingMode: "enquiry" }, travelDate: "2026-10-20", adults: 4, children: 0, childAges: [], tax, today: TODAY }), (e: QuoteError) => e.code === "ENQUIRY_ONLY");
  });

  test("group tier replaces base price", () => {
    const tiered = { ...tour, pricing: { ...tour.pricing, groupTiers: [{ minPeople: 8, maxPeople: 15, adultPrice: r(8499) }] } };
    const q = quoteTour({ tour: tiered, travelDate: "2026-10-20", adults: 8, children: 0, childAges: [], tax, today: TODAY });
    assert.equal(q.subtotal, r(8499) * 8);
  });
});

describe("cancellation", () => {
  const policy = {
    id: "pol",
    name: "Darshan standard",
    rules: [{ daysBeforeMin: 15, refundPercent: 100 }, { daysBeforeMin: 7, refundPercent: 50 }, { daysBeforeMin: 0, refundPercent: 0 }],
    nonRefundableLineTypes: ["addon" as const],
    fixedDeduction: r(200),
    refundGst: true,
  };
  const lines = [
    { type: "tour" as const, taxable: r(36000), gstAmount: r(1800) },
    { type: "addon" as const, taxable: r(1000), gstAmount: r(180) },
  ];
  test("tiers by days before start, add-ons excluded, deduction applied", () => {
    const full = calculateRefund({ policy, lines, total: r(38980), amountPaid: r(38980), serviceStartDate: "2026-11-20", cancelDate: "2026-11-01" });
    assert.equal(full.refundPercent, 100);
    assert.equal(full.refundAmount, r(37800) - r(200));
    const half = calculateRefund({ policy, lines, total: r(38980), amountPaid: r(38980), serviceStartDate: "2026-11-20", cancelDate: "2026-11-10" });
    assert.equal(half.refundAmount, r(18900) - r(200));
    const none = calculateRefund({ policy, lines, total: r(38980), amountPaid: r(38980), serviceStartDate: "2026-11-20", cancelDate: "2026-11-18" });
    assert.equal(none.refundAmount, 0);
  });
});
