import type { Stay } from "@/lib/db";

export const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, X-Api-Key, Authorization" };

export const v1json = (data: unknown, init: ResponseInit & { cache?: string } = {}) =>
  Response.json(data, { ...init, headers: { ...cors, ...(init.cache ? { "Cache-Control": init.cache } : {}), ...(init.headers ?? {}) } });

/** Public representation of a stay. Never includes internal tokens or channel-manager ids. */
export const publicStay = (s: Stay) => ({
  id: s.id, slug: s.slug, title: s.title, tagline: s.tagline, description: s.description, type: s.type,
  city: s.city, state: s.state, area: s.address, images: s.images, amenities: s.amenities, collections: s.collections,
  bedrooms: s.bedrooms, bathrooms: s.bathrooms, baseGuests: s.baseGuests, maxGuests: s.maxGuests,
  pricing: { currency: "INR", basePrice: s.basePrice, weekendPrice: s.weekendPrice, extraGuestFee: s.extraGuestFee, cleaningFee: s.cleaningFee, minNights: s.minNights },
  checkInTime: s.checkInTime, checkOutTime: s.checkOutTime, rating: s.rating, reviewCount: s.reviewCount,
});
