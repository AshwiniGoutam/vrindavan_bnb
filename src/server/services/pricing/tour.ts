import type { Paise } from "@/lib/money";
import { diffDays, type ISODate } from "@/lib/dates";
import { finalizeQuote, line, type RawLine } from "./finalize";
import { addOnLines } from "./addons";
import { QuoteError, type AddOnSelection, type DiscountContext, type DiscountInput, type Quote, type TaxConfig } from "./types";

export interface TourPricingInput {
  id: string;
  title: string;
  bookingMode: "online" | "enquiry" | "both";
  pricing: {
    adultPrice: Paise;
    childPrice?: Paise; // defaults to adult price
    childAgeMax?: number; // children older than this pay adult price
    compareAtPrice?: Paise; // per adult, display only
    extraBedPrice?: Paise;
    singleSupplement?: Paise;
    groupTiers: { minPeople: number; maxPeople: number; adultPrice: Paise }[];
  };
  group: { min: number; max?: number; childrenCountTowardMinimum: boolean };
  advanceDays: number;
  dateMode: "any_date" | "fixed_dates";
  blackoutDates: ISODate[];
}

export interface TourDepartureInput {
  date: ISODate;
  status: "open" | "closed" | "sold_out";
  capacity: number;
  booked: number;
  priceOverride?: Paise;
}

export interface TourQuoteInput {
  tour: TourPricingInput;
  travelDate: ISODate;
  adults: number;
  children: number;
  childAges: number[];
  extraBeds?: number;
  singleRooms?: number;
  vehicle?: { name: string; surcharge: Paise };
  /** Required for fixed_dates tours; for any_date tours, pass it if a capacity record exists. */
  departure?: TourDepartureInput;
  addOns?: AddOnSelection[];
  discount?: DiscountInput;
  discountContext?: DiscountContext;
  tax: TaxConfig;
  today: ISODate;
}

/** Guest-facing date status, used by the date picker as well as the quote. */
export function tourDateStatus(
  tour: TourPricingInput,
  date: ISODate,
  today: ISODate,
  departure?: TourDepartureInput,
): "available" | "advance_window" | "past" | "unavailable" | "sold_out" {
  if (date < today) return "past";
  if (tour.blackoutDates.includes(date)) return "unavailable";
  if (tour.dateMode === "fixed_dates" && !departure) return "unavailable";
  if (departure?.status === "closed") return "unavailable";
  if (departure && (departure.status === "sold_out" || departure.booked >= departure.capacity)) return "sold_out";
  if (diffDays(today, date) < tour.advanceDays) return "advance_window";
  return "available";
}

export function quoteTour(input: TourQuoteInput): Quote {
  const { tour, adults, children, childAges } = input;

  if (tour.bookingMode === "enquiry") throw new QuoteError("ENQUIRY_ONLY", "This journey is booked on enquiry. Please contact us on WhatsApp.");
  if (childAges.length !== children) throw new QuoteError("GROUP_SIZE", "Please provide an age for each child.");

  const status = tourDateStatus(tour, input.travelDate, input.today, input.departure);
  if (status === "past") throw new QuoteError("PAST_DATE", "This date is in the past.");
  if (status === "advance_window")
    throw new QuoteError(
      "ADVANCE_WINDOW",
      "Online booking is unavailable for this date. Contact us on WhatsApp for availability.",
      { advanceDays: tour.advanceDays },
    );
  if (status === "unavailable") throw new QuoteError("DATE_UNAVAILABLE", "This date isn't available for this journey.");
  if (status === "sold_out") throw new QuoteError("SOLD_OUT", "This departure is fully booked.");

  const people = adults + children;
  const countedForMin = tour.group.childrenCountTowardMinimum ? people : adults;
  if (adults < 1 || countedForMin < tour.group.min)
    throw new QuoteError("GROUP_SIZE", `This journey needs a group of at least ${tour.group.min} people.`, { min: tour.group.min });
  if (tour.group.max && people > tour.group.max)
    throw new QuoteError("GROUP_SIZE", `This journey takes up to ${tour.group.max} people.`, { max: tour.group.max });
  if (input.departure && input.departure.booked + people > input.departure.capacity)
    throw new QuoteError("SOLD_OUT", `Only ${input.departure.capacity - input.departure.booked} places left on this date.`, {
      remaining: input.departure.capacity - input.departure.booked,
    });

  const tier = tour.pricing.groupTiers.find((t) => people >= t.minPeople && people <= t.maxPeople);
  const adultPrice = input.departure?.priceOverride ?? tier?.adultPrice ?? tour.pricing.adultPrice;
  const childPrice = tour.pricing.childPrice ?? adultPrice;
  const childAgeMax = tour.pricing.childAgeMax ?? Infinity;
  const adultRated = adults + childAges.filter((a) => a > childAgeMax).length;
  const childRated = children - (adultRated - adults);

  const lines: RawLine[] = [];
  lines.push(line("tour", `${tour.title} · ${adultRated} adult${adultRated > 1 ? "s" : ""}`, adultRated, adultPrice, "darshan", { tourId: tour.id }));
  if (childRated > 0)
    lines.push(line("tour", `${tour.title} · ${childRated} child${childRated > 1 ? "ren" : ""}`, childRated, childPrice, "darshan", { tourId: tour.id }));
  if (input.extraBeds && tour.pricing.extraBedPrice)
    lines.push(line("extra_bed", `Extra bed × ${input.extraBeds}`, input.extraBeds, tour.pricing.extraBedPrice, "darshan"));
  if (input.singleRooms && tour.pricing.singleSupplement)
    lines.push(line("single_supplement", `Single room supplement × ${input.singleRooms}`, input.singleRooms, tour.pricing.singleSupplement, "darshan"));
  if (input.vehicle?.surcharge) lines.push(line("vehicle", `Vehicle: ${input.vehicle.name}`, 1, input.vehicle.surcharge, "darshan"));

  const addOns = addOnLines(input.addOns ?? [], people, 0);
  lines.push(...addOns);

  let compareAtTotal: Paise | undefined;
  if (tour.pricing.compareAtPrice && tour.pricing.compareAtPrice > adultPrice) {
    const subtotal = lines.reduce((s, l) => s + l.amount, 0);
    compareAtTotal = subtotal + (tour.pricing.compareAtPrice - adultPrice) * adultRated;
  }

  return finalizeQuote({
    vertical: "darshan",
    lines,
    tax: input.tax,
    discount: input.discount,
    discountContext: input.discountContext,
    scope: { vertical: "darshan", tourId: tour.id, today: input.today },
    compareAtTotal,
    meta: { tourId: tour.id, travelDate: input.travelDate, people, adults, children, perPersonPrice: adultPrice },
  });
}
