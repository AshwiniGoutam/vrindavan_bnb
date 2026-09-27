import "server-only";
import { nightsBetween, addDays } from "@/lib/dates";
import type { AvailabilityMap, ChannelRef } from "../channel-manager/types";
import { ezeeConfig } from "./config";
import { ezeeRequest } from "./client";

/** Shape to be confirmed against eZee docs; mapping is isolated in `mapAvailability`. */
interface EzeeAvailabilityResponse {
  roomTypes?: { roomTypeId: string; dates: { date: string; available: number }[] }[];
}

export async function fetchAvailability(refs: ChannelRef[], from: string, to: string): Promise<AvailabilityMap> {
  const res = await ezeeRequest<EzeeAvailabilityResponse>(ezeeConfig().endpoints.availability, {
    fromDate: from,
    toDate: to,
    roomTypeIds: refs.map((r) => r.externalRoomTypeId).filter(Boolean),
  });
  return mapAvailability(res, refs, from, to);
}

export function mapAvailability(res: EzeeAvailabilityResponse, refs: ChannelRef[], from: string, to: string): AvailabilityMap {
  const nights = nightsBetween(from, addDays(to, 1));
  const map: AvailabilityMap = {};
  for (const ref of refs) {
    const rt = res.roomTypes?.find((r) => r.roomTypeId === ref.externalRoomTypeId);
    map[ref.propertyId] = Object.fromEntries(
      nights.map((n) => {
        const units = rt?.dates.find((d) => d.date === n)?.available ?? 0; // unknown ⇒ unavailable (safe default)
        return [n, { available: units > 0, units }];
      }),
    );
  }
  return map;
}
