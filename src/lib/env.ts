import "server-only";
import { z } from "zod";

/**
 * Server environment, validated lazily (so `next build` works without secrets).
 * Integrations are optional: when not configured the factories fall back to
 * development providers. Production refuses mock payments.
 */
const schema = z.object({
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),

  MONGODB_URI: z.string().optional(),
  MONGODB_DB: z.string().default("vhi"),

  CRON_SECRET: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default("vhi"),

  PAYMENT_PROVIDER: z.enum(["mock", "razorpay"]).default("mock"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  CHANNEL_MANAGER_PROVIDER: z.enum(["manual", "ezee"]).default("manual"),
  EZEE_API_URL: z.string().optional(),
  EZEE_API_KEY: z.string().optional(),
  EZEE_API_SECRET: z.string().optional(),
  EZEE_HOTEL_CODE: z.string().optional(),

  WHATSAPP_PROVIDER: z.enum(["console", "meta_cloud", "interakt"]).default("console"),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),

  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  EMAIL_FROM: z.string().default("VHI Luxury Homestays <bookings@example.com>"),
  EMAIL_API_KEY: z.string().optional(),

  META_ACCESS_TOKEN: z.string().optional(),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().optional(),
});

export type Env = z.infer<typeof schema>;
let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(
    Object.fromEntries(Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v])),
  );
  if (!parsed.success) {
    throw new Error("Invalid environment: " + parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; "));
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = () => env().APP_ENV === "production";
