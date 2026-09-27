import { line, type RawLine } from "./finalize";
import type { AddOnSelection } from "./types";

/**
 * per_trip / per_day: guest-chosen qty. per_person: party size. per_booking: always 1.
 * on_request: recorded at ₹0 so VHI sees it in the booking and quotes it separately.
 */
export function addOnLines(selections: AddOnSelection[], persons: number, _nights: number): RawLine[] {
  return selections
    .filter((s) => s.qty > 0 || s.addOn.pricingUnit === "per_person" || s.addOn.pricingUnit === "per_booking")
    .map(({ addOn, qty }) => {
      const q =
        addOn.pricingUnit === "per_person" ? persons : addOn.pricingUnit === "per_booking" || addOn.pricingUnit === "on_request" ? 1 : qty;
      const capped = addOn.maxQty ? Math.min(q, addOn.maxQty) : q;
      const price = addOn.pricingUnit === "on_request" ? 0 : addOn.price;
      const unitLabel: Record<string, string> = { per_trip: "trip", per_day: "day", per_person: "guest", per_booking: "", on_request: "on request" };
      const label = addOn.pricingUnit === "on_request" ? `${addOn.name} (price on request)` : capped > 1 ? `${addOn.name} × ${capped} ${unitLabel[addOn.pricingUnit]}s` : addOn.name;
      return line("addon", label, capped, price, "addon", { addOnId: addOn.id, pricingUnit: addOn.pricingUnit });
    });
}
