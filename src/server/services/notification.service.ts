import "server-only";
import { formatINR } from "@/lib/money";
import { appUrl } from "@/lib/utils";
import { whatsapp } from "@/lib/integrations/whatsapp";
import { emailProvider } from "@/lib/integrations/email";
import { emailLayout } from "@/lib/integrations/email/templates";
import { connectDB } from "@/server/db/connect";
import { Booking, Notification, Payment } from "@/server/models";
import { getSettings } from "./settings.service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any;

const fmtDate = (iso?: string) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "-";

/** One source for every booking message so WhatsApp, email and admin views agree. */
export function bookingSummary(b: Doc) {
  const item = b.items?.[0] ?? {};
  const guests = `${item.adults ?? 0} adult${item.adults === 1 ? "" : "s"}${item.children ? `, ${item.children} child${item.children === 1 ? "" : "ren"}` : ""}`;
  const dates = item.kind === "tour" ? fmtDate(item.travelDate) : `${fmtDate(item.checkIn)} → ${fmtDate(item.checkOut)}`;
  const addOns = (b.addOns ?? []).map((a: Doc) => a.name).join(", ") || "None";
  const discount = b.pricing?.discount?.amount ? `${b.pricing.discount.name}${b.pricing.discount.code ? ` (${b.pricing.discount.code})` : ""} −${formatINR(b.pricing.discount.amount)}` : "None";
  return {
    code: b.code,
    guestName: b.guest?.name ?? "-",
    phone: b.guest?.phone ?? "-",
    item: item.title ?? "-",
    vertical: b.vertical === "darshan" ? "Darshan Tour" : b.vertical === "stay_food" ? "Stay + Sattvik Food" : "Stay",
    dates,
    checkIn: item.checkIn ?? item.travelDate ?? "",
    checkOut: item.checkOut ?? "",
    nights: String(item.nights ?? "-"),
    guests,
    mealPlan: item.mealPlanName ?? "None",
    addOns,
    discount,
    gst: formatINR(b.pricing?.gstTotal ?? 0),
    total: formatINR(b.pricing?.total ?? 0),
    paymentStatus: b.paymentStatus,
    specialRequests: b.specialRequests || "None",
  };
}

export async function enqueueBookingNotifications(b: Doc) {
  await connectDB();
  if (b.notificationsQueued) return;
  const s = await getSettings();
  const n = s.notifications;
  const sum = bookingSummary(b);
  const link = `${appUrl()}/booking/${b.code}`;
  const adminLink = `${appUrl()}/admin/bookings/${b._id}`;
  const docs: Doc[] = [];

  // Variable order for the approved WhatsApp templates (documented in README → WhatsApp setup).
  const adminVars = [sum.code, sum.guestName, sum.phone, `${sum.vertical}: ${sum.item}`, sum.dates, sum.nights, sum.guests, sum.mealPlan, sum.addOns, sum.discount, sum.gst, sum.total, sum.paymentStatus, sum.specialRequests];
  const adminText = [
    `New booking ${sum.code}`,
    `Guest: ${sum.guestName} (${sum.phone})`,
    `${sum.vertical}: ${sum.item}`,
    `Dates: ${sum.dates} · Nights: ${sum.nights}`,
    `Guests: ${sum.guests}`,
    `Meal plan: ${sum.mealPlan}`,
    `Add-ons: ${sum.addOns}`,
    `Discount: ${sum.discount}`,
    `GST: ${sum.gst} · Total: ${sum.total} (${sum.paymentStatus})`,
    `Requests: ${sum.specialRequests}`,
    adminLink,
  ].join("\n");

  for (const to of n.adminWhatsappNumbers ?? [])
    docs.push({ channel: "whatsapp", audience: "admin", event: "admin_new_booking", to, template: n.adminBookingTemplate, variables: adminVars, body: adminText, bookingId: b._id });
  for (const to of n.adminEmails ?? [])
    docs.push({
      channel: "email",
      audience: "admin",
      event: "admin_new_booking",
      to,
      subject: `New booking ${sum.code} · ${sum.item} · ${sum.total}`,
      body: adminText,
      html: emailLayout({
        heading: `New booking ${sum.code}`,
        rows: [["Guest", `${sum.guestName} · ${sum.phone}`], [sum.vertical, sum.item], ["Dates", sum.dates], ["Nights", sum.nights], ["Guests", sum.guests], ["Meal plan", sum.mealPlan], ["Add-ons", sum.addOns], ["Discount", sum.discount], ["GST", sum.gst], ["Total", `${sum.total} · ${sum.paymentStatus}`], ["Special requests", sum.specialRequests]],
        cta: { label: "Open in admin", href: adminLink },
      }),
      bookingId: b._id,
    });

  if (n.sendGuestWhatsapp)
    docs.push({
      channel: "whatsapp",
      audience: "guest",
      event: "guest_booking_confirmed",
      to: b.guest.phone,
      template: n.guestConfirmationTemplate,
      variables: [sum.guestName, sum.code, sum.item, sum.dates, sum.guests, sum.total, link],
      body: `Radhe Radhe ${sum.guestName}! Your VHI booking ${sum.code} is confirmed.\n${sum.item}\n${sum.dates} · ${sum.guests}\nPaid: ${sum.total}\n${link}`,
      bookingId: b._id,
    });
  if (n.sendGuestEmail && b.guest.email)
    docs.push({
      channel: "email",
      audience: "guest",
      event: "guest_booking_confirmed",
      to: b.guest.email,
      subject: `Your VHI booking is confirmed · ${sum.code}`,
      body: `Your booking ${sum.code} is confirmed. ${sum.item}, ${sum.dates}. Total paid ${sum.total}.`,
      html: emailLayout({
        preheader: `Booking ${sum.code} confirmed`,
        heading: "Your Vrindavan stay is confirmed",
        intro: `Radhe Radhe ${sum.guestName}. Thank you for booking with VHI — we look forward to hosting you. Your payment has been received.`,
        rows: [["Booking ID", sum.code], [sum.vertical, sum.item], ["Dates", sum.dates], ["Guests", sum.guests], ["Meal plan", sum.mealPlan], ["Add-ons", sum.addOns], ["GST", sum.gst], ["Total paid", sum.total]],
        cta: { label: "View booking", href: link },
        footerNote: `Questions? WhatsApp or call us${s.business.phone ? ` on ${s.business.phone}` : ""}. Exact address and check-in details are shared before arrival.`,
      }),
      bookingId: b._id,
    });

  // Separate payment receipt (the confirmation above covers the stay itself).
  if (n.sendGuestEmail && b.guest.email) {
    const pay = await Payment.findOne({ bookingId: b._id, kind: "payment", status: "captured" }).sort({ updatedAt: -1 }).lean<{ paymentId?: string; method?: string; amount: number; updatedAt?: Date }>();
    const paidAt = new Date(pay?.updatedAt ?? Date.now()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
    docs.push({
      channel: "email",
      audience: "guest",
      event: "guest_payment_received",
      to: b.guest.email,
      subject: `Payment received · ${formatINR(pay?.amount ?? b.pricing.total)} · ${sum.code}`,
      body: `We have received your payment of ${formatINR(pay?.amount ?? b.pricing.total)} for booking ${sum.code}.`,
      html: emailLayout({
        preheader: `Payment of ${formatINR(pay?.amount ?? b.pricing.total)} received`,
        heading: "Payment received",
        intro: `Thank you, ${sum.guestName}. This is your payment receipt for booking ${sum.code}.`,
        rows: [
          ["Amount paid", formatINR(pay?.amount ?? b.pricing.total)],
          ["Paid on", paidAt],
          ["Payment ID", pay?.paymentId ?? "-"],
          ["Method", pay?.method ?? "Online"],
          ["Booking ID", sum.code],
          ["Of which GST", sum.gst],
          ...(b.invoiceNumber ? ([["Invoice number", String(b.invoiceNumber)]] as [string, string][]) : []),
        ],
        cta: { label: "View booking", href: link },
        footerNote: "Keep this email for your records. A GST invoice is available on request.",
      }),
      bookingId: b._id,
    });
  }

  if (docs.length) await Notification.insertMany(docs);
  await Booking.updateOne({ _id: b._id }, { notificationsQueued: true });
}

export async function enqueueCancellationNotifications(bookingId: string, refundAmount: number) {
  await connectDB();
  const b = await Booking.findById(bookingId).lean<Doc>();
  if (!b) return;
  const s = await getSettings();
  const sum = bookingSummary(b);
  const refundText = refundAmount > 0 ? `A refund of ${formatINR(refundAmount)} has been initiated to your original payment method.` : "";
  const docs: Doc[] = [
    {
      channel: "whatsapp",
      audience: "guest",
      event: "guest_booking_cancelled",
      to: b.guest.phone,
      template: s.notifications.guestCancellationTemplate,
      variables: [sum.guestName, sum.code, formatINR(refundAmount)],
      body: `Your VHI booking ${sum.code} has been cancelled. ${refundText}`,
      bookingId: b._id,
    },
  ];
  if (b.guest.email)
    docs.push({
      channel: "email",
      audience: "guest",
      event: "guest_booking_cancelled",
      to: b.guest.email,
      subject: `Booking ${sum.code} cancelled`,
      body: `Your booking ${sum.code} has been cancelled. ${refundText}`,
      html: emailLayout({ heading: "Your booking has been cancelled", intro: `Booking ${sum.code} (${sum.item}) has been cancelled. ${refundText}`, footerNote: "Refunds usually reach your account in 5–7 working days, depending on your bank." }),
      bookingId: b._id,
    });
  await Notification.insertMany(docs);
}

export async function enqueueEnquiryNotification(e: { name: string; phone: string; subject?: string; travelDate?: string; people?: number; message?: string }) {
  await connectDB();
  const s = await getSettings();
  const text = `New enquiry: ${e.subject ?? "General"}\n${e.name} · ${e.phone}${e.travelDate ? `\nDate: ${e.travelDate}` : ""}${e.people ? ` · ${e.people} people` : ""}${e.message ? `\n${e.message}` : ""}`;
  const docs: Doc[] = [
    ...(s.notifications.adminWhatsappNumbers ?? []).map((to) => ({
      channel: "whatsapp",
      audience: "admin",
      event: "admin_enquiry",
      to,
      template: s.notifications.adminEnquiryTemplate,
      variables: [e.subject ?? "General", e.name, e.phone, e.travelDate ?? "-", String(e.people ?? "-"), e.message ?? "-"],
      body: text,
    })),
    ...(s.notifications.adminEmails ?? []).map((to) => ({ channel: "email", audience: "admin", event: "admin_enquiry", to, subject: `New enquiry · ${e.subject ?? "General"} · ${e.name}`, body: text, html: emailLayout({ heading: "New enquiry", intro: text }) })),
  ];
  if (docs.length) await Notification.insertMany(docs);
}

export async function enqueueUrgentAdminAlert(message: string) {
  await connectDB();
  const s = await getSettings();
  const docs: Doc[] = [
    ...(s.notifications.adminWhatsappNumbers ?? []).map((to) => ({ channel: "whatsapp", audience: "admin", event: "admin_urgent", to, template: s.notifications.adminBookingTemplate, variables: [message], body: `URGENT: ${message}` })),
    ...(s.notifications.adminEmails ?? []).map((to) => ({ channel: "email", audience: "admin", event: "admin_urgent", to, subject: "URGENT · VHI booking system", body: message, html: emailLayout({ heading: "Action needed", intro: message }) })),
  ];
  if (docs.length) await Notification.insertMany(docs);
  else console.error(`[urgent] ${message}`);
}

/** Sends queued messages with exponential backoff. Called right after booking and by cron every minute. */
export async function dispatchOutbox(limit = 25) {
  await connectDB();
  const due = await Notification.find({ status: "queued", nextAttemptAt: { $lte: new Date() } }).sort({ createdAt: 1 }).limit(limit).lean<Doc[]>();
  let sent = 0;
  for (const n of due) {
    // claim it so concurrent runs don't double-send
    const claimed = await Notification.findOneAndUpdate(
      { _id: n._id, status: "queued", attempts: n.attempts },
      { $inc: { attempts: 1 }, nextAttemptAt: new Date(Date.now() + 5 * 60_000) },
    ).lean();
    if (!claimed) continue;
    try {
      const s = await getSettings();
      const res =
        n.channel === "whatsapp"
          ? await whatsapp().sendTemplate({ to: n.to, template: n.template, language: s.notifications.templateLanguage || "en", variables: n.variables ?? [], preview: n.body })
          : await emailProvider().send({ to: n.to, subject: n.subject, html: n.html ?? `<pre>${n.body}</pre>`, text: n.body });
      await Notification.updateOne({ _id: n._id }, { status: "sent", sentAt: new Date(), providerMessageId: "messageId" in res ? res.messageId : res.id, lastError: null });
      sent++;
    } catch (e) {
      const attempts = n.attempts + 1;
      await Notification.updateOne(
        { _id: n._id },
        { lastError: (e as Error).message, status: attempts >= 6 ? "failed" : "queued", nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000) },
      );
    }
  }
  return { processed: due.length, sent };
}

export async function retryNotification(id: string) {
  await connectDB();
  await Notification.updateOne({ _id: id }, { status: "queued", nextAttemptAt: new Date() });
  return dispatchOutbox(5);
}
