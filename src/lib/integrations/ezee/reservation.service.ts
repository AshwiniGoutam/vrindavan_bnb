import "server-only";
import { paiseToRupees } from "@/lib/money";
import { ChannelManagerError, type ReservationInput } from "../channel-manager/types";
import { ezeeConfig } from "./config";
import { ezeeRequest } from "./client";

interface EzeeReservationResponse {
  reservationId?: string;
  status?: string;
  message?: string;
}

/** Pushes a confirmed website booking to eZee so OTA inventory is closed. */
export async function pushReservation(r: ReservationInput): Promise<{ externalReservationId: string }> {
  const res = await ezeeRequest<EzeeReservationResponse>(ezeeConfig().endpoints.createReservation, {
    externalReference: r.bookingCode,
    roomTypeId: r.ref.externalRoomTypeId,
    ratePlanId: r.ref.externalRatePlanId,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    adults: r.adults,
    children: r.children,
    guest: r.guest,
    totalAmount: paiseToRupees(r.totalAmount),
    paidAmount: paiseToRupees(r.amountPaid),
    source: "VHI Website",
    notes: r.notes,
  });
  if (!res.reservationId) throw new ChannelManagerError(`eZee did not return a reservation id: ${res.message ?? "unknown"}`, true);
  return { externalReservationId: res.reservationId };
}
