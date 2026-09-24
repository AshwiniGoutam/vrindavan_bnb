import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { notifyNewEnquiry } from "@/lib/notify";
import { mail } from "@/lib/email";
import { background } from "@/lib/background";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().regex(/^\+?\d[\d\s-]{8,14}$/, "Enter a valid phone number"),
  message: z.string().trim().min(5, "Tell us a little more").max(2000),
  topic: z.enum(["stay", "group", "list-property", "other"]).default("stay"),
  stayId: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guests: z.number().int().min(1).max(100).optional(),
  website: z.string().max(0).optional(), // honeypot: real people leave it empty
});

export async function POST(req: Request) {
  if (!rateLimit(`enquiry:${clientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { website, ...data } = parsed.data;
  void website;

  const enquiry = await db.enquiry.create({ data });
  background(async () => {
    await Promise.allSettled([notifyNewEnquiry(enquiry), mail.enquiryAdmin(enquiry), mail.enquiryAck(enquiry)]);
  });
  return NextResponse.json({ ok: true });
}
