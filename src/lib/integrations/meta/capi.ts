import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";

const sha = (v?: string) => (v ? createHash("sha256").update(v.trim().toLowerCase()).digest("hex") : undefined);

/**
 * Meta Conversions API — server-side Purchase / Lead events, deduplicated with the browser Pixel via eventId.
 * No-op when META_ACCESS_TOKEN or NEXT_PUBLIC_META_PIXEL_ID is missing. Never throws into booking flow.
 */
export async function sendMetaEvent(e: {
  name: "Purchase" | "Lead" | "InitiateCheckout";
  eventId: string;
  value?: number; // rupees
  contentName?: string;
  user: { phone?: string; email?: string; ip?: string; userAgent?: string; fbp?: string; fbc?: string };
  sourceUrl?: string;
}) {
  const { META_ACCESS_TOKEN: token, NEXT_PUBLIC_META_PIXEL_ID: pixel } = env();
  if (!token || !pixel) return;
  try {
    await fetch(`https://graph.facebook.com/v21.0/${pixel}/events?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [
          {
            event_name: e.name,
            event_time: Math.floor(Date.now() / 1000),
            event_id: e.eventId,
            action_source: "website",
            event_source_url: e.sourceUrl,
            user_data: {
              ph: sha(e.user.phone?.replace(/\D/g, "")),
              em: sha(e.user.email),
              client_ip_address: e.user.ip,
              client_user_agent: e.user.userAgent,
              fbp: e.user.fbp,
              fbc: e.user.fbc,
            },
            custom_data: e.value != null ? { currency: "INR", value: e.value, content_name: e.contentName } : { content_name: e.contentName },
          },
        ],
      }),
    });
  } catch (err) {
    console.warn("[meta-capi] send failed", err);
  }
}
