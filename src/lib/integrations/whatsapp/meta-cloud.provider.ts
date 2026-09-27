import type { WhatsAppProvider, WhatsAppTemplateMessage } from "./types";

/** Meta WhatsApp Cloud API. Pin the Graph API version you have tested with. */
const GRAPH_VERSION = "v21.0";

export class MetaCloudWhatsApp implements WhatsAppProvider {
  readonly name = "meta_cloud" as const;
  constructor(private cfg: { phoneNumberId: string; accessToken: string }) {}

  async sendTemplate(m: WhatsAppTemplateMessage) {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${this.cfg.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.cfg.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: m.to.replace(/^\+/, ""),
        type: "template",
        template: {
          name: m.template,
          language: { code: m.language },
          components: [{ type: "body", parameters: m.variables.map((text) => ({ type: "text", text: text || "-" })) }],
        },
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    if (!res.ok || !body.messages?.[0]) throw new Error(`WhatsApp (Meta) failed: ${body.error?.message ?? res.status}`);
    return { messageId: body.messages[0].id };
  }
}
