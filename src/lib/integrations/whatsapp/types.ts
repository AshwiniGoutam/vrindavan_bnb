/** Provider-agnostic WhatsApp contract: booking logic sends an approved template with ordered variables. */
export interface WhatsAppTemplateMessage {
  to: string; // E.164
  template: string; // approved template name (Admin → Settings → Notifications)
  language: string;
  variables: string[];
  /** Plain-text fallback used by the console provider and for logs. */
  preview?: string;
}
export interface WhatsAppProvider {
  readonly name: "console" | "meta_cloud" | "interakt";
  sendTemplate(m: WhatsAppTemplateMessage): Promise<{ messageId: string }>;
}
