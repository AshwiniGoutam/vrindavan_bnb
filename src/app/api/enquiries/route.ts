import { NextResponse, type NextRequest } from "next/server";
import { enquirySchema } from "@/server/validation";
import { connectDB } from "@/server/db/connect";
import { DarshanTour, Enquiry, Property } from "@/server/models";
import { enqueueEnquiryNotification, dispatchOutbox } from "@/server/services/notification.service";
import { trackServerEvent } from "@/server/services/analytics.service";
import { sendMetaEvent } from "@/lib/integrations/meta/capi";
import { rateLimit, clientIp } from "@/server/rate-limit";
import { errorResponse } from "@/server/auth/with-admin";

export async function POST(req: NextRequest) {
  try {
    await rateLimit("enquiry", 5, 300);
    const body = enquirySchema.parse(await req.json());
    if (body.website) return NextResponse.json({ ok: true }); // bot honeypot
    await connectDB();
    const [tour, property] = await Promise.all([
      body.tourSlug ? DarshanTour.findOne({ slug: body.tourSlug }).select("_id title").lean<{ _id: unknown; title: string }>() : null,
      body.propertySlug ? Property.findOne({ slug: body.propertySlug }).select("_id name").lean<{ _id: unknown; name: string }>() : null,
    ]);
    const subject = body.subject ?? tour?.title ?? property?.name ?? "General enquiry";
    const doc = await Enquiry.create({ ...body, subject, tourId: tour?._id, propertyId: property?._id });
    await enqueueEnquiryNotification({ ...body, subject });
    await trackServerEvent({ type: "enquiry", vertical: tour ? "darshan" : property ? "stay" : undefined, utm_source: body.attribution?.utm_source, utm_campaign: body.attribution?.utm_campaign });
    await sendMetaEvent({ name: "Lead", eventId: String(doc._id), contentName: subject, user: { phone: body.phone, email: body.email, ip: await clientIp(), userAgent: req.headers.get("user-agent") ?? undefined } });
    await dispatchOutbox(10).catch(() => undefined);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
