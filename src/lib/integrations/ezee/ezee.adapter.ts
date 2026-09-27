import "server-only";
import type { ChannelManagerProvider, ChannelRef, ReservationInput } from "../channel-manager/types";
import { fetchAvailability } from "./availability.service";
import { fetchRates } from "./rates.service";
import { pushReservation } from "./reservation.service";
import { cancelReservation } from "./cancellation.service";
import { ezeeConfig, isEzeeConfigured } from "./config";
import { ezeeRequest } from "./client";

/** Adapter: implements the generic ChannelManagerProvider using the eZee services. */
export class EzeeChannelManager implements ChannelManagerProvider {
  readonly name = "ezee" as const;
  getAvailability(q: { refs: ChannelRef[]; from: string; to: string }) {
    return fetchAvailability(q.refs, q.from, q.to);
  }
  getRates(q: { refs: ChannelRef[]; from: string; to: string }) {
    return fetchRates(q.refs, q.from, q.to);
  }
  createReservation(r: ReservationInput) {
    return pushReservation(r);
  }
  cancelReservation(id: string, reason?: string) {
    return cancelReservation(id, reason);
  }
  async healthCheck() {
    if (!isEzeeConfigured()) return { ok: false, message: "eZee credentials missing (EZEE_API_URL, EZEE_API_KEY, EZEE_HOTEL_CODE)." };
    try {
      await ezeeRequest(ezeeConfig().endpoints.ping, {});
      return { ok: true, message: "eZee reachable." };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  }
}
