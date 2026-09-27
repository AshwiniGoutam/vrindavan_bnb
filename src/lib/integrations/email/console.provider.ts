import type { EmailMessage, EmailProvider } from "./types";
export class ConsoleEmail implements EmailProvider {
  readonly name = "console" as const;
  async send(m: EmailMessage) {
    console.info(`\n[email:console] → ${[m.to].flat().join(", ")}\nSubject: ${m.subject}\n${m.text ?? ""}\n`);
    return { id: `console_${Date.now()}` };
  }
}
