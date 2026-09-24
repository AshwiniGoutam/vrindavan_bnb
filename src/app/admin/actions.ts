"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { slugify } from "@/lib/utils";
import { syncAllFeeds, syncFeed } from "@/lib/ical";
import { background } from "@/lib/background";
import { channexEnabled, fullSync } from "@/lib/channex";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const int = (fd: FormData, k: string, d = 0) => {
  const v = parseInt(str(fd, k), 10);
  return Number.isFinite(v) && v >= 0 ? v : d;
};
const lines = (s: string) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

export async function saveStay(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const title = str(fd, "title");
  const city = str(fd, "city");
  if (!title || !city) throw new Error("Title and city are required");

  const data = {
    title,
    tagline: str(fd, "tagline") || null,
    description: str(fd, "description"),
    type: str(fd, "type") || "Villa",
    city,
    state: str(fd, "state"),
    address: str(fd, "address") || null,
    collections: fd.getAll("collections").map(String),
    amenities: fd.getAll("amenities").map(String),
    images: lines(str(fd, "images")).filter((u) => /^https?:\/\//.test(u)),
    bedrooms: int(fd, "bedrooms", 1),
    bathrooms: int(fd, "bathrooms", 1),
    baseGuests: int(fd, "baseGuests", 2),
    maxGuests: Math.max(1, int(fd, "maxGuests", 4)),
    basePrice: Math.max(1, int(fd, "basePrice", 1000)),
    weekendPrice: int(fd, "weekendPrice") || null,
    extraGuestFee: int(fd, "extraGuestFee"),
    cleaningFee: int(fd, "cleaningFee"),
    minNights: Math.max(1, int(fd, "minNights", 1)),
    checkInTime: str(fd, "checkInTime") || "14:00",
    checkOutTime: str(fd, "checkOutTime") || "11:00",
    rules: str(fd, "rules") || null,
    rating: Math.min(5, Math.max(0, parseFloat(str(fd, "rating")) || 4.8)),
    reviewCount: int(fd, "reviewCount"),
    featured: fd.get("featured") === "on",
    published: fd.get("published") === "on",
  };

  if (id) {
    await db.stay.update({ where: { id }, data });
    // Price or minimum-stay changes must reach connected channels too.
    if (channexEnabled()) background(() => fullSync(id));
  } else {
    let slug = slugify(str(fd, "slug") || title);
    if (await db.stay.findUnique({ where: { slug } })) slug += `-${randomBytes(2).toString("hex")}`;
    await db.stay.create({ data: { ...data, slug } });
  }
  revalidatePath("/", "layout");
  redirect("/admin/stays");
}

/** Stays with booking history are unpublished instead of deleted, so records stay intact. */
export async function deleteStay(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const used = await db.booking.count({ where: { stayId: id } });
  if (used > 0) await db.stay.update({ where: { id }, data: { published: false } });
  else await db.stay.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/admin/stays");
}

export async function updateBookingStatus(fd: FormData) {
  await requireAdmin();
  const status = str(fd, "status");
  if (!["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"].includes(status)) return;
  await db.booking.update({ where: { id: str(fd, "id") }, data: { status: status as "PENDING" } });
  revalidatePath("/admin", "layout");
}

export async function updateEnquiryStatus(fd: FormData) {
  await requireAdmin();
  const status = str(fd, "status");
  if (!["NEW", "CONTACTED", "CLOSED"].includes(status)) return;
  await db.enquiry.update({ where: { id: str(fd, "id") }, data: { status: status as "NEW" } });
  revalidatePath("/admin", "layout");
}

export async function addFeed(fd: FormData) {
  await requireAdmin();
  const url = str(fd, "url");
  if (!/^https?:\/\//.test(url)) return;
  const feed = await db.icalFeed.create({ data: { stayId: str(fd, "stayId"), name: str(fd, "name") || "Other channel", url } });
  await syncFeed(feed.id);
  revalidatePath("/admin/channels");
}

export async function removeFeed(fd: FormData) {
  await requireAdmin();
  await db.icalFeed.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/", "layout");
}

export async function syncOne(fd: FormData) {
  await requireAdmin();
  await syncFeed(str(fd, "id"));
  revalidatePath("/", "layout");
}

export async function syncAll() {
  await requireAdmin();
  await syncAllFeeds();
  revalidatePath("/", "layout");
}
