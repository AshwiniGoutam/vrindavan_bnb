export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}
export interface EmailProvider {
  readonly name: "console" | "resend";
  send(m: EmailMessage): Promise<{ id: string }>;
}
