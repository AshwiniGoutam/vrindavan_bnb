import "server-only";
import { rupeesToPaise } from "@/lib/money";
import type { ChannelRef, RateMap } from "../channel-manager/types";
import { ezeeConfig } from "./config";
import { ezeeRequest } from "./client";

interface EzeeRatesResponse {
  rates?: { roomTypeId: string; ratePlanId?: string; dates: { date: string; amount: number /* rupees */ }[] }[];
}

/** Only used for properties whose pricingSource is "channel". */
export async function fetchRates(refs: ChannelRef[], from: string, to: string): Promise<RateMap> {
  const res = await ezeeRequest<EzeeRatesResponse>(ezeeConfig().endpoints.rates, {
    fromDate: from,
    toDate: to,
    roomTypeIds: refs.map((r) => r.externalRoomTypeId).filter(Boolean),
  });
  const map: RateMap = {};
  for (const ref of refs) {
    const r = res.rates?.find((x) => x.roomTypeId === ref.externalRoomTypeId && (!ref.externalRatePlanId || x.ratePlanId === ref.externalRatePlanId));
    map[ref.propertyId] = Object.fromEntries((r?.dates ?? []).map((d) => [d.date, rupeesToPaise(d.amount)]));
  }
  return map;
}
