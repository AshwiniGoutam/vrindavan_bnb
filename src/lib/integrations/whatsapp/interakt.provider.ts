import type { WhatsAppProvider, WhatsAppTemplateMessage } from "./types";

/** Interakt public API. Confirm field names against the client's Interakt account before go-live. */
export class InteraktWhatsApp implements WhatsAppProvider {
  readonly name = "interakt" as const;
  constructor(private cfg: { apiKey: string }) {}

  async sendTemplate(m: WhatsAppTemplateMessage) {
    const digits = m.to.replace(/\D/g, "");
    const res = await fetch("https://api.interakt.ai/v1/public/message/", {
      method: "POST",
      headers: { Authorization: `Basic ${this.cfg.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        countryCode: `+${digits.slice(0, digits.length - 10) || "91"}`,
        phoneNumber: digits.slice(-10),
        type: "Template",
        template: { name: m.template, languageCode: m.language, bodyValues: m.variables },
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { result?: boolean; id?: string; message?: string };
    if (!res.ok || body.result === false) throw new Error(`WhatsApp (Interakt) failed: ${body.message ?? res.status}`);
    return { messageId: body.id ?? `interakt_${Date.now()}` };
  }
}
