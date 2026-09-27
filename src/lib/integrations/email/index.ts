import "server-only";
import { env } from "@/lib/env";
import { ConsoleEmail } from "./console.provider";
import { ResendEmail } from "./resend.provider";
import type { EmailProvider } from "./types";

let instance: EmailProvider | undefined;
export function emailProvider(): EmailProvider {
  if (instance) return instance;
  const e = env();
  if (e.EMAIL_PROVIDER === "resend") {
    if (!e.EMAIL_API_KEY) throw new Error("EMAIL_PROVIDER=resend but EMAIL_API_KEY is missing.");
    instance = new ResendEmail({ apiKey: e.EMAIL_API_KEY, from: e.EMAIL_FROM });
  } else instance = new ConsoleEmail();
  return instance;
}
export * from "./types";
