import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { stayQuoteSchema, tourQuoteSchema } from "@/server/validation";
import { quoteStayRequest, quoteTourRequest } from "@/server/services/quote.service";
import { rateLimit } from "@/server/rate-limit";
import { errorResponse } from "@/server/auth/with-admin";

const schema = z.discriminatedUnion("vertical", [z.object({ vertical: z.literal("stay"), request: stayQuoteSchema }), z.object({ vertical: z.literal("darshan"), request: tourQuoteSchema })]);

/** Live price quote. The server always recomputes — the browser never sends prices. */
export async function POST(req: NextRequest) {
  try {
    await rateLimit("quote", 60, 60);
    const body = schema.parse(await req.json());
    const result = body.vertical === "stay" ? await quoteStayRequest(body.request) : await quoteTourRequest(body.request);
    return NextResponse.json({ ok: true, data: { quote: result.quote, discountKind: result.discountKind } });
  } catch (e) {
    return errorResponse(e);
  }
}
