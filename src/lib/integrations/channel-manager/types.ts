import type { ISODate } from "@/lib/dates";
import type { Paise } from "@/lib/money";

/**
 * The booking system talks ONLY to this interface. Swap providers with
 * CHANNEL_MANAGER_PROVIDER=manual|ezee — no booking code changes.
 */
export interface ChannelRef {
  propertyId: string; // our MongoDB id
  externalPropertyId?: string; // eZee hotel code (if per-property)
  externalRoomTypeId?: string; // eZee room type
  externalRatePlanId?: string; // eZee rate plan
}

export type AvailabilityMap = Record<string, Record<ISODate, { available: boolean; units: number }>>;
export type RateMap = Record<string, Record<ISODate, Paise>>;

export interface ReservationInput {
  bookingCode: string;
  ref: ChannelRef;
  checkIn: ISODate;
  checkOut: ISODate;
  adults: number;
  children: number;
  guest: { name: string; phone: string; email?: string };
  totalAmount: Paise;
  amountPaid: Paise;
  notes?: string;
}

export interface ChannelManagerProvider {
  readonly name: "manual" | "ezee";
  getAvailability(q: { refs: ChannelRef[]; from: ISODate; to: ISODate }): Promise<AvailabilityMap>;
  getRates(q: { refs: ChannelRef[]; from: ISODate; to: ISODate }): Promise<RateMap>;
  createReservation(r: ReservationInput): Promise<{ externalReservationId: string }>;
  cancelReservation(externalReservationId: string, reason?: string): Promise<void>;
  healthCheck(): Promise<{ ok: boolean; message: string }>;
}

export class ChannelManagerError extends Error {
  constructor(message: string, public retryable: boolean, public cause?: unknown) {
    super(message);
  }
}
