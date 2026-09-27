import { withAdmin, ok } from "@/server/auth/with-admin";
import { env } from "@/lib/env";
import { channelManager } from "@/lib/integrations/channel-manager";
import { isCloudinaryConfigured } from "@/lib/integrations/cloudinary/server";

/** Integration status for Settings → Integrations. Never returns secrets. */
export const GET = withAdmin("settings.manage", async () => {
  const e = env();
  const cm = await channelManager().healthCheck();
  return ok({
    environment: e.APP_ENV,
    payments: { provider: e.PAYMENT_PROVIDER, configured: e.PAYMENT_PROVIDER === "mock" || Boolean(e.RAZORPAY_KEY_ID && e.RAZORPAY_KEY_SECRET), webhookSecret: Boolean(e.RAZORPAY_WEBHOOK_SECRET) },
    channelManager: { provider: channelManager().name, ...cm },
    cloudinary: { configured: isCloudinaryConfigured() },
    whatsapp: { provider: e.WHATSAPP_PROVIDER },
    email: { provider: e.EMAIL_PROVIDER, from: e.EMAIL_FROM },
    analytics: { ga4: Boolean(process.env.NEXT_PUBLIC_GA_ID), metaPixel: Boolean(e.NEXT_PUBLIC_META_PIXEL_ID), metaCapi: Boolean(e.META_ACCESS_TOKEN) },
    cron: { secretSet: Boolean(e.CRON_SECRET) },
  });
});
