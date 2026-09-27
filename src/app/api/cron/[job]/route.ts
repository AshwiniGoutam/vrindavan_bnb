import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { expireHolds, reconcilePayments, syncPendingChannelReservations } from "@/server/services/booking.service";
import { dispatchOutbox } from "@/server/services/notification.service";

const JOBS: Record<string, () => Promise<unknown>> = {
  "expire-holds": expireHolds,
  outbox: () => dispatchOutbox(50),
  "channel-sync": syncPendingChannelReservations,
  "reconcile-payments": reconcilePayments,
};

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ job: string }> }) {
  const secret = env().CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  const { job } = await params;
  const fn = JOBS[job];
  if (!fn) return NextResponse.json({ ok: false, error: "Unknown job" }, { status: 404 });
  try {
    return NextResponse.json({ ok: true, job, result: await fn() });
  } catch (e) {
    console.error(`[cron:${job}]`, e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
