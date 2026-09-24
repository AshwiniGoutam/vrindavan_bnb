import { db } from "./db";
import { formatDate, inr, utcISO } from "./utils";

/** digits only; a bare 10-digit Indian number gets the 91 prefix */
export function normalizePhone(p: string) {
  const d = p.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
}

async function sendTemplate(to: string, template: string | undefined, params: string[]) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId || !template) {
    console.log("[whatsapp skipped: not configured]", template, params);
    return false;
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhone(to),
        type: "template",
        template: {
          name: template,
          language: { code: "en" },
          components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
        },
      }),
    });
    if (!res.ok) console.error("[whatsapp error]", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("[whatsapp error]", e);
    return false;
  }
}

/**
 * Template bodies you create in Meta Business Manager (variables in order):
 *  booking_confirmed      : {{1}} guest, {{2}} stay, {{3}} check-in, {{4}} check-out, {{5}} booking code
 *  new_booking_admin      : {{1}} code, {{2}} stay, {{3}} dates, {{4}} guest + phone, {{5}} amount
 *  new_enquiry_admin      : {{1}} name, {{2}} phone, {{3}} message
 */
export async function notifyBookingConfirmed(bookingId: string) {
  const b = await db.booking.findUnique({ where: { id: bookingId }, include: { stay: true } });
  if (!b) return;
  const inD = formatDate(utcISO(b.checkIn));
  const outD = formatDate(utcISO(b.checkOut));
  await Promise.all([
    sendTemplate(b.guestPhone, process.env.WHATSAPP_TEMPLATE_BOOKING, [b.guestName, b.stay.title, inD, outD, b.code]),
    process.env.WHATSAPP_ADMIN_NUMBER
      ? sendTemplate(process.env.WHATSAPP_ADMIN_NUMBER, process.env.WHATSAPP_TEMPLATE_ADMIN, [
          b.code, b.stay.title, `${inD} to ${outD}`, `${b.guestName} ${b.guestPhone}`, inr(b.total),
        ])
      : Promise.resolve(false),
  ]);
}

export async function notifyNewEnquiry(e: { name: string; phone: string; message: string }) {
  if (!process.env.WHATSAPP_ADMIN_NUMBER) return;
  await sendTemplate(process.env.WHATSAPP_ADMIN_NUMBER, process.env.WHATSAPP_TEMPLATE_ENQUIRY, [
    e.name, e.phone, e.message.slice(0, 200),
  ]);
}
