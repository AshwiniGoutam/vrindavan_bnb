import { NextResponse, type NextRequest } from "next/server";
import { retryPayment } from "@/server/services/booking.service";
import { errorResponse } from "@/server/auth/with-admin";
import { rateLimit } from "@/server/rate-limit";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    await rateLimit("retry", 10, 60);
    const { code } = await params;
    return NextResponse.json({ ok: true, data: await retryPayment(code) });
  } catch (e) {
    return errorResponse(e);
  }
}
