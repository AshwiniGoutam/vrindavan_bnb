import type { EmailMessage, EmailProvider } from "./types";
export class ResendEmail implements EmailProvider {
  readonly name = "resend" as const;
  constructor(private cfg: { apiKey: string; from: string }) {}
  async send(m: EmailMessage) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.cfg.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.cfg.from, to: [m.to].flat(), subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !body.id) throw new Error(`Email (Resend) failed: ${body.message ?? res.status}`);
    return { id: body.id };
  }
}
