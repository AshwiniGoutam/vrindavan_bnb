import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { connectDB } from "@/server/db/connect";
import { Notification } from "@/server/models";

/** Meta webhook verification handshake. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const token = env().WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (token && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === token) return new NextResponse(p.get("hub.challenge"));
  return new NextResponse("Forbidden", { status: 403 });
}

/** Delivery status updates (sent / delivered / read / failed). */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = env().WHATSAPP_APP_SECRET;
  if (secret) {
    const sig = (req.headers.get("x-hub-signature-256") ?? "").replace("sha256=", "");
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return new NextResponse("Bad signature", { status: 401 });
  }
  try {
    const body = JSON.parse(raw) as { entry?: { changes?: { value?: { statuses?: { id: string; status: string; errors?: { title?: string }[] }[] } }[] }[] };
    await connectDB();
    for (const entry of body.entry ?? [])
      for (const change of entry.changes ?? [])
        for (const s of change.value?.statuses ?? [])
          if (s.status === "failed") await Notification.updateOne({ providerMessageId: s.id }, { status: "failed", lastError: s.errors?.[0]?.title ?? "Delivery failed" });
  } catch (e) {
    console.warn("[whatsapp-webhook]", e);
  }
  return NextResponse.json({ ok: true });
}
