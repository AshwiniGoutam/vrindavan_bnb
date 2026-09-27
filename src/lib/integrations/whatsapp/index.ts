import "server-only";
import { env } from "@/lib/env";
import { ConsoleWhatsApp } from "./console.provider";
import { MetaCloudWhatsApp } from "./meta-cloud.provider";
import { InteraktWhatsApp } from "./interakt.provider";
import type { WhatsAppProvider } from "./types";

let instance: WhatsAppProvider | undefined;
export function whatsapp(): WhatsAppProvider {
  if (instance) return instance;
  const e = env();
  if (e.WHATSAPP_PROVIDER === "meta_cloud") {
    if (!e.WHATSAPP_ACCESS_TOKEN || !e.WHATSAPP_PHONE_NUMBER_ID) throw new Error("Meta WhatsApp needs WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.");
    instance = new MetaCloudWhatsApp({ accessToken: e.WHATSAPP_ACCESS_TOKEN, phoneNumberId: e.WHATSAPP_PHONE_NUMBER_ID });
  } else if (e.WHATSAPP_PROVIDER === "interakt") {
    if (!e.WHATSAPP_ACCESS_TOKEN) throw new Error("Interakt needs WHATSAPP_ACCESS_TOKEN (API key).");
    instance = new InteraktWhatsApp({ apiKey: e.WHATSAPP_ACCESS_TOKEN });
  } else instance = new ConsoleWhatsApp();
  return instance;
}
export * from "./types";
