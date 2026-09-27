import type { Paise } from "@/lib/money";
import type { ISODate } from "@/lib/dates";

export type Vertical = "stay" | "stay_food" | "darshan";
export type GstVertical = "accommodation" | "stay_food" | "darshan" | "meal" | "addon";
export type LineType = "room" | "extra_guest" | "meal" | "package" | "tour" | "extra_bed" | "single_supplement" | "vehicle" | "addon";

/** GST is admin-configured (rates confirmed by the client's CA). Slabs apply to the per-unit price. */
export interface TaxConfig {
  verticals: Record<GstVertical, { rate: number; slabs?: { maxUnitPrice: Paise | null; rate: number }[] }>;
}

export interface PriceRule {
  id: string;
  kind: "date_override" | "season" | "festival";
  propertyIds: "all" | string[];
  dateRanges: { from: ISODate; to: ISODate }[]; // inclusive
  adjustment: { type: "fixed_rate" | "percent" | "flat_delta"; value: number }; // fixed_rate/flat_delta in paise
  priority: number;
  active: boolean;
}

export interface MealEligibility {
  minNights: number;
  /** "gte" = nights >= minNights (current client rule: 3 or more). "gt" = strictly more than. */
  comparison: "gte" | "gt";
}

export interface MealPlanInput {
  id: string;
  name: string;
  pricingModel: "per_person_per_night" | "per_booking_per_night";
  adultPrice: Paise;
  childPrice: Paise;
  childAgeMin: number; // below this: free
  childAgeMax: number; // above this: adult price
  eligibility: MealEligibility;
}

export interface AddOnInput {
  id: string;
  name: string;
  pricingUnit: "per_trip" | "per_day" | "per_person" | "per_booking" | "on_request";
  price: Paise;
  maxQty?: number;
}
export interface AddOnSelection {
  addOn: AddOnInput;
  qty: number; // ignored for per_person (uses party size) and per_booking
}

export interface DiscountInput {
  id: string;
  kind: "auto_offer" | "coupon";
  code?: string;
  name: string;
  type: "percent" | "flat";
  value: number; // percent, or paise for flat
  maxDiscount?: Paise;
  minAmount?: Paise;
  minNights?: number;
  verticals: Vertical[];
  propertyIds?: string[];
  tourIds?: string[];
  packageIds?: string[];
  startsAt?: ISODate;
  endsAt?: ISODate;
  active: boolean;
  firstBookingOnly: boolean;
  appliesToAddOns?: boolean;
  showStrikeThrough?: boolean;
}

/** Facts about the customer the pure engine can't look up itself. */
export interface DiscountContext {
  isFirstBooking: boolean;
  usageLimitReached: boolean;
  perCustomerLimitReached: boolean;
}

export interface QuoteLine {
  type: LineType;
  label: string;
  quantity: number;
  unitPrice: Paise;
  amount: Paise; // gross = quantity * unitPrice
  discount: Paise; // allocated share of the booking discount
  taxable: Paise; // amount - discount
  gstVertical: GstVertical;
  gstRate: number;
  gstAmount: Paise;
  meta?: Record<string, unknown>;
}

export interface Quote {
  vertical: Vertical;
  lines: QuoteLine[];
  subtotal: Paise;
  discountTotal: Paise;
  taxableAmount: Paise;
  gstTotal: Paise;
  total: Paise;
  discount?: { id: string; code?: string; name: string; amount: Paise };
  discountRejected?: string;
  display: { compareAtTotal?: Paise; savePercent?: number };
  meta: Record<string, unknown>;
  pricingVersion: string;
}

export class QuoteError extends Error {
  constructor(public code: QuoteErrorCode, message: string, public details?: Record<string, unknown>) {
    super(message);
  }
}
export type QuoteErrorCode =
  | "INVALID_DATES"
  | "PAST_DATE"
  | "MIN_NIGHTS"
  | "MAX_NIGHTS"
  | "OCCUPANCY"
  | "MEAL_NOT_ELIGIBLE"
  | "PACKAGE_NIGHTS_MISMATCH"
  | "ADVANCE_WINDOW"
  | "GROUP_SIZE"
  | "SOLD_OUT"
  | "DATE_UNAVAILABLE"
  | "ENQUIRY_ONLY"
  | "MISSING_RATE";

export const PRICING_VERSION = "2026.09.1";
