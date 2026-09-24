import { CheckCircle2, Circle } from "lucide-react";
import { db } from "@/lib/db";
import { ChangePasswordForm } from "@/components/PasswordForms";
import ApiKeys from "@/components/admin/ApiKeys";
import { site } from "@/lib/config";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const env = (...k: string[]) => k.every((x) => !!process.env[x]);

export default async function Settings() {
  const keys = await db.apiKey.findMany({ orderBy: { createdAt: "desc" } });
  const integrations = [
    ["MongoDB", env("MONGODB_URI"), "MONGODB_URI, MONGODB_DB"],
    ["Razorpay payments", env("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"), "RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET"],
    ["Razorpay webhook", env("RAZORPAY_WEBHOOK_SECRET"), "RAZORPAY_WEBHOOK_SECRET"],
    ["Email (Resend)", env("RESEND_API_KEY"), "RESEND_API_KEY, EMAIL_FROM"],
    ["WhatsApp Cloud API", env("WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID"), "WHATSAPP_TOKEN, WHATSAPP_PHONE_ID"],
    ["Photo upload (Cloudinary)", env("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"), "CLOUDINARY_*"],
    ["Channel manager (Channex)", env("CHANNEX_API_KEY"), "CHANNEX_API_KEY, CHANNEX_WEBHOOK_SECRET"],
    ["Scheduled jobs", env("CRON_SECRET"), "CRON_SECRET"],
  ] as const;

  return (
    <div className="grid max-w-4xl gap-8">
      <h1 className="text-3xl">Settings</h1>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-sans text-lg font-semibold">Integrations</h2>
        <p className="mt-1 text-sm text-stone">Set these as environment variables where the site is hosted.</p>
        <ul className="mt-4 divide-y divide-line text-sm">
          {integrations.map(([label, on, vars]) => (
            <li key={label} className="flex items-center justify-between gap-3 py-2.5">
              <span className="flex items-center gap-2">{on ? <CheckCircle2 size={17} className="text-emerald-700" /> : <Circle size={17} className="text-stone" />}{label}</span>
              <span className="text-xs text-stone">{on ? "Connected" : vars}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-sans text-lg font-semibold">Change your password</h2>
        <ChangePasswordForm />
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-sans text-lg font-semibold">API</h2>
        <p className="mt-1 text-sm text-stone">Let other software read your stays and availability, or create bookings. Reads are public; bookings need a key.</p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-mist p-4 text-xs leading-relaxed">{`GET  ${site.url}/api/v1/stays?city=Goa&guests=4
GET  ${site.url}/api/v1/stays/{slug}
GET  ${site.url}/api/v1/stays/{slug}/availability?from=2026-11-01&to=2026-11-30
POST ${site.url}/api/v1/quote      { slug, checkIn, checkOut, guests, coupon? }

GET  ${site.url}/api/v1/bookings    (X-Api-Key)
POST ${site.url}/api/v1/bookings    (X-Api-Key)
     { stayId, checkIn, checkOut, guests, guestName, guestPhone, total?, paid?, source? }`}</pre>
        <div className="mt-5"><ApiKeys keys={keys.map((k) => ({ id: k.id, name: k.name, prefix: k.prefix, createdAt: k.createdAt.toISOString(), lastUsedAt: k.lastUsedAt?.toISOString() ?? null, revokedAt: k.revokedAt?.toISOString() ?? null }))} /></div>
      </section>
    </div>
  );
}
