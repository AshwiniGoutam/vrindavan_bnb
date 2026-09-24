import type { Booking, Stay } from "@/lib/db";
import { site } from "./config";
import { formatDate, inr, utcISO } from "./utils";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.log(`[email skipped: RESEND_API_KEY not set] to=${to} subject=${subject}`); return false; }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? `${site.name} <onboarding@resend.dev>`, to: [to], subject, html }),
    });
    if (!res.ok) console.error("[email error]", res.status, await res.text());
    return res.ok;
  } catch (e) { console.error("[email error]", e); return false; }
}

const shell = (heading: string, inner: string) => `
<div style="background:#f1f4ef;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#12352f">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
    <p style="font-size:22px;margin:0 0 4px;font-weight:bold">${esc(site.name)}</p>
    <h1 style="font-size:20px;margin:16px 0 12px">${heading}</h1>
    <div style="font-size:15px;line-height:1.6">${inner}</div>
    <p style="margin-top:28px;font-size:12px;color:#5f6a65">Questions? Reply to this email or message us on WhatsApp: +${esc(site.whatsapp)}.</p>
  </div>
</div>`;
const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${href}" style="background:#12352f;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block">${esc(label)}</a></p>`;

type B = Booking & { stay: Stay };
const summary = (b: B) => `
<table style="width:100%;font-size:14px;border-collapse:collapse">
  <tr><td style="padding:4px 0;color:#5f6a65">Stay</td><td style="text-align:right"><b>${esc(b.stay.title)}</b>, ${esc(b.stay.city)}</td></tr>
  <tr><td style="padding:4px 0;color:#5f6a65">Check-in</td><td style="text-align:right">${formatDate(utcISO(b.checkIn))}, from ${esc(b.stay.checkInTime)}</td></tr>
  <tr><td style="padding:4px 0;color:#5f6a65">Check-out</td><td style="text-align:right">${formatDate(utcISO(b.checkOut))}, by ${esc(b.stay.checkOutTime)}</td></tr>
  <tr><td style="padding:4px 0;color:#5f6a65">Guests</td><td style="text-align:right">${b.guests}</td></tr>
  <tr><td style="padding:4px 0;color:#5f6a65">Booking code</td><td style="text-align:right">${esc(b.code)}</td></tr>
  <tr><td style="padding:4px 0;color:#5f6a65">Total</td><td style="text-align:right"><b>${inr(b.total)}</b></td></tr>
</table>`;

export const adminEmail = () => process.env.ADMIN_NOTIFY_EMAIL ?? process.env.ADMIN_EMAIL;

export const mail = {
  verify: (to: string, name: string, url: string) =>
    sendEmail(to, `Confirm your email for ${site.name}`, shell(`Hi ${esc(name)}, confirm your email`, `<p>Tap the button to confirm your email address. The link works for 24 hours.</p>${button(url, "Confirm email")}<p style="font-size:12px;color:#5f6a65">If you didn't create an account, ignore this email.</p>`)),

  reset: (to: string, name: string, url: string) =>
    sendEmail(to, `Reset your ${site.name} password`, shell(`Hi ${esc(name)}, reset your password`, `<p>Use the button below to choose a new password. The link works for 1 hour and only once.</p>${button(url, "Choose a new password")}<p style="font-size:12px;color:#5f6a65">If you didn't ask for this, you can ignore this email. Your password won't change.</p>`)),

  bookingConfirmed: (b: B) =>
    b.guestEmail ? sendEmail(b.guestEmail, `Booking confirmed: ${b.stay.title}`, shell(`You're booked, ${esc(b.guestName.split(" ")[0])}`, `<p>Your stay is confirmed. Here are the details.</p>${summary(b)}${button(`${site.url}/booking/${b.id}`, "View booking")}`)) : Promise.resolve(false),

  adminNewBooking: (b: B) => {
    const to = adminEmail();
    return to ? sendEmail(to, `New booking ${b.code}: ${b.stay.title}`, shell("New booking", `${summary(b)}<p>Guest: ${esc(b.guestName)}, ${esc(b.guestPhone)}, ${esc(b.guestEmail)}<br>Source: ${esc(b.sourceName ?? b.source)}</p>`)) : Promise.resolve(false);
  },

  cancelled: (b: B, refund: number) =>
    b.guestEmail ? sendEmail(b.guestEmail, `Booking cancelled: ${b.code}`, shell("Your booking was cancelled", `${summary(b)}<p>${refund > 0 ? `A refund of <b>${inr(refund)}</b> has been started. It usually reaches your original payment method in 5 to 7 working days.` : "No refund applies to this cancellation under our cancellation policy."}</p>`)) : Promise.resolve(false),

  autoRefund: (b: B) =>
    b.guestEmail ? sendEmail(b.guestEmail, `Refund started for ${b.stay.title}`, shell("We couldn't hold your dates", `<p>Your payment reached us after your reserved dates were taken by someone else. We've started a full refund of <b>${inr(b.total)}</b>. It usually reaches you in 5 to 7 working days. We're sorry, please try other dates or message us and we'll help.</p>`)) : Promise.resolve(false),

  adminAlert: (subject: string, text: string) => {
    const to = adminEmail();
    return to ? sendEmail(to, subject, shell(esc(subject), `<p>${esc(text)}</p>`)) : Promise.resolve(false);
  },

  enquiryAdmin: (e: { name: string; email: string; phone: string; message: string; topic: string }) => {
    const to = adminEmail();
    return to ? sendEmail(to, `New enquiry from ${e.name}`, shell("New enquiry", `<p><b>${esc(e.name)}</b> · ${esc(e.phone)} · ${esc(e.email)}<br>Topic: ${esc(e.topic)}</p><p style="white-space:pre-line">${esc(e.message)}</p>`)) : Promise.resolve(false);
  },

  enquiryAck: (e: { name: string; email: string }) =>
    sendEmail(e.email, `We got your message`, shell(`Thanks, ${esc(e.name.split(" ")[0])}`, `<p>We've received your enquiry and will reply within a few hours, usually on WhatsApp.</p>`)),
};
