import "server-only";
import { ezeeConfig } from "./config";
import { ezeeRequest } from "./client";

export async function cancelReservation(externalReservationId: string, reason?: string): Promise<void> {
  await ezeeRequest(ezeeConfig().endpoints.cancelReservation, { reservationId: externalReservationId, reason: reason ?? "Cancelled on VHI website" });
}
