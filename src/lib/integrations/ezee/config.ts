import "server-only";
import { env } from "@/lib/env";

/**
 * eZee (Yanolja) configuration. Endpoint paths are placeholders — fill them from the
 * API documentation the client obtains from eZee, together with hotel code & room mapping.
 */
export function ezeeConfig() {
  const e = env();
  return {
    baseUrl: e.EZEE_API_URL,
    apiKey: e.EZEE_API_KEY,
    apiSecret: e.EZEE_API_SECRET,
    hotelCode: e.EZEE_HOTEL_CODE,
    endpoints: {
      availability: "/availability", // TODO(eZee docs)
      rates: "/rates", // TODO(eZee docs)
      createReservation: "/reservations", // TODO(eZee docs)
      cancelReservation: "/reservations/cancel", // TODO(eZee docs)
      ping: "/ping", // TODO(eZee docs)
    },
    timeoutMs: 10_000,
  };
}

export const isEzeeConfigured = () => {
  const c = ezeeConfig();
  return Boolean(c.baseUrl && c.apiKey && c.hotelCode);
};
