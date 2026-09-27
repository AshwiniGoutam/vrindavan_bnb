import { randomBytes } from "node:crypto";
import type { WhatsAppProvider, WhatsAppTemplateMessage } from "./types";

export class ConsoleWhatsApp implements WhatsAppProvider {
  readonly name = "console" as const;
  async sendTemplate(m: WhatsAppTemplateMessage) {
    console.info(`\n[whatsapp:console] → ${m.to} (${m.template})\n${m.preview ?? m.variables.join(" | ")}\n`);
    return { messageId: `console_${randomBytes(4).toString("hex")}` };
  }
}
