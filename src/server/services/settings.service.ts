import "server-only";
import { cache } from "react";
import { connectDB, isDbConfigured } from "@/server/db/connect";
import { Settings } from "@/server/models";
import { serialize, type SettingsDTO } from "@/server/types";
import type { TaxConfig } from "./pricing";

export const DEFAULT_SETTINGS: SettingsDTO = {
  business: { brandName: "Vrindavan Holiday Inn", tagline: "Luxury Homestays" },
  home: {},
  tax: { accommodationRate: 0, stayFoodRate: 0, darshanRate: 0, mealRate: 0, addonRate: 0, showPricesWithTax: false, invoicePrefix: "VHI" },
  booking: { holdMinutes: 12, maxAdvanceDays: 365, defaultMinGroupSize: 4, defaultAdvanceDays: 15, defaultMealMinNights: 3 },
  notifications: {
    adminWhatsappNumbers: [],
    adminEmails: [],
    templateLanguage: "en",
    guestConfirmationTemplate: "vhi_booking_confirmed",
    adminBookingTemplate: "vhi_admin_new_booking",
    adminEnquiryTemplate: "vhi_admin_new_enquiry",
    guestCancellationTemplate: "vhi_booking_cancelled",
    sendGuestWhatsapp: true,
    sendGuestEmail: true,
  },
  contacts: [],
};

function merge(doc: Partial<SettingsDTO> | null): SettingsDTO {
  const d = doc ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...d,
    business: { ...DEFAULT_SETTINGS.business, ...(d.business ?? {}) },
    home: { ...DEFAULT_SETTINGS.home, ...(d.home ?? {}) },
    tax: { ...DEFAULT_SETTINGS.tax, ...(d.tax ?? {}) },
    booking: { ...DEFAULT_SETTINGS.booking, ...(d.booking ?? {}) },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(d.notifications ?? {}) },
    contacts: d.contacts ?? [],
  };
}

/** Request-scoped cached site settings. Falls back to defaults when the DB isn't configured (e.g. during build). */
export const getSettings = cache(async (): Promise<SettingsDTO> => {
  if (!isDbConfigured()) return DEFAULT_SETTINGS;
  try {
    await connectDB();
    const doc = await Settings.findById("site").lean();
    return merge(serialize<Partial<SettingsDTO>>(doc));
  } catch (e) {
    console.error("[settings] load failed", e);
    return DEFAULT_SETTINGS;
  }
});

export function taxConfigFrom(s: SettingsDTO): TaxConfig {
  const t = s.tax;
  const accommodation =
    t.accommodationSlabLimit && t.accommodationRateAboveSlab != null
      ? { rate: t.accommodationRate, slabs: [{ maxUnitPrice: t.accommodationSlabLimit, rate: t.accommodationRate }, { maxUnitPrice: null, rate: t.accommodationRateAboveSlab }] }
      : { rate: t.accommodationRate };
  return {
    verticals: {
      accommodation,
      stay_food: { rate: t.stayFoodRate },
      darshan: { rate: t.darshanRate },
      meal: { rate: t.mealRate },
      addon: { rate: t.addonRate },
    },
  };
}
