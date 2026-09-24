"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { recomputeRating } from "@/lib/reviews";
import { cancelBooking } from "@/lib/booking-service";
import { channexEnabled, fullSync, pullBookings } from "@/lib/channex";
import { collectionList, destinations } from "@/lib/config";
import { slugify } from "@/lib/utils";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => { const n = parseInt(str(fd, k), 10); return Number.isFinite(n) ? n : undefined; };
const done = (path = "/admin") => revalidatePath(path, "layout");

// ---------- reviews ----------
export async function toggleReview(fd: FormData) {
  await requireAdmin();
  const r = await db.review.findUnique({ where: { id: str(fd, "id") } });
  if (!r) return;
  await db.review.update({ where: { id: r.id }, data: { published: !r.published } });
  await recomputeRating(r.stayId);
  done("/");
}
export async function replyReview(fd: FormData) {
  await requireAdmin();
  await db.review.update({ where: { id: str(fd, "id") }, data: { hostReply: str(fd, "reply").slice(0, 800) || null } });
  done("/");
}

// ---------- coupons ----------
export async function createCoupon(fd: FormData) {
  await requireAdmin();
  const code = str(fd, "code").toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const type = str(fd, "type") === "FLAT" ? "FLAT" : "PERCENT";
  const value = num(fd, "value") ?? 0;
  if (!code || value < 1 || (type === "PERCENT" && value > 100)) redirect("/admin/coupons?error=Enter a code and a valid value.");
  if (await db.coupon.findUnique({ where: { code } })) redirect("/admin/coupons?error=That code already exists.");
  const to = str(fd, "validTo");
  await db.coupon.create({
    data: {
      code, type, value, description: str(fd, "description") || null,
      minNights: Math.max(1, num(fd, "minNights") ?? 1), minAmount: Math.max(0, num(fd, "minAmount") ?? 0),
      maxDiscount: num(fd, "maxDiscount") || null, usageLimit: num(fd, "usageLimit") || null,
      validTo: to ? new Date(`${to}T23:59:59+05:30`) : null, stayIds: fd.getAll("stayIds").map(String),
    },
  });
  done();
  redirect("/admin/coupons");
}
export async function toggleCoupon(fd: FormData) {
  await requireAdmin();
  const c = await db.coupon.findUnique({ where: { id: str(fd, "id") } });
  if (c) await db.coupon.update({ where: { id: c.id }, data: { active: !c.active } });
  done();
}
export async function deleteCoupon(fd: FormData) {
  await requireAdmin();
  await db.coupon.delete({ where: { id: str(fd, "id") } });
  done();
}

// ---------- users ----------
export async function setUserRole(fd: FormData) {
  const me = await requireAdmin();
  const id = str(fd, "id");
  if (id === me.id) return; // never let an admin lock themselves out
  await db.user.update({ where: { id }, data: { role: str(fd, "role") === "ADMIN" ? "ADMIN" : "USER" } });
  done();
}

// ---------- content (collections + destinations) ----------
export async function saveCollection(fd: FormData) {
  await requireAdmin();
  const title = str(fd, "title");
  if (!title) return;
  const id = str(fd, "id");
  const data = { title, blurb: str(fd, "blurb"), image: str(fd, "image") || null, sortOrder: num(fd, "sortOrder") ?? 0, active: fd.get("active") === "on" };
  if (id) await db.collection.update({ where: { id }, data });
  else {
    let slug = slugify(str(fd, "slug") || title);
    if (await db.collection.findUnique({ where: { slug } })) slug += "-2";
    await db.collection.create({ data: { ...data, slug } });
  }
  done("/");
}
export async function deleteCollection(fd: FormData) {
  await requireAdmin();
  await db.collection.delete({ where: { id: str(fd, "id") } });
  done("/");
}
export async function saveDestination(fd: FormData) {
  await requireAdmin();
  const name = str(fd, "name");
  if (!name) return;
  const id = str(fd, "id");
  const data = { name, sortOrder: num(fd, "sortOrder") ?? 0, active: fd.get("active") === "on" };
  if (id) await db.destination.update({ where: { id }, data });
  else await db.destination.upsert({ where: { name }, update: data, create: data });
  done("/");
}
export async function deleteDestination(fd: FormData) {
  await requireAdmin();
  await db.destination.delete({ where: { id: str(fd, "id") } });
  done("/");
}
export async function loadDefaultContent() {
  await requireAdmin();
  if ((await db.collection.count()) === 0) {
    await db.collection.createMany({ data: collectionList.map((c, i) => ({ slug: c.slug, title: c.title, blurb: c.blurb, image: c.image, sortOrder: i })) });
  }
  if ((await db.destination.count()) === 0) {
    await db.destination.createMany({ data: destinations.map((name, i) => ({ name, sortOrder: i })) });
  }
  done("/");
}

// ---------- bookings ----------
export async function cancelBookingAdmin(fd: FormData) {
  await requireAdmin();
  const mode = ["policy", "full", "none"].includes(str(fd, "refundMode")) ? (str(fd, "refundMode") as "policy") : "policy";
  const r = await cancelBooking({ bookingId: str(fd, "id"), actor: "admin", refundMode: mode });
  done();
  redirect(`/admin/bookings?${r.ok ? `notice=${encodeURIComponent(`Cancelled${r.refundAmount ? `, refund of ₹${r.refundAmount} started` : ""}`)}` : `error=${encodeURIComponent(r.error)}`}`);
}

// ---------- channel manager (Channex) ----------
export async function saveChannexMapping(fd: FormData) {
  await requireAdmin();
  const v = (k: string) => str(fd, k) || null;
  await db.stay.update({ where: { id: str(fd, "stayId") }, data: { channexPropertyId: v("propertyId"), channexRoomTypeId: v("roomTypeId"), channexRatePlanId: v("ratePlanId") } });
  done("/admin");
}
export async function channexPushStay(fd: FormData) {
  await requireAdmin();
  if (channexEnabled()) await fullSync(str(fd, "stayId"));
  done("/admin");
}
export async function channexPullNow() {
  await requireAdmin();
  await pullBookings();
  done("/admin");
}

// ---------- homepage / CMS sections ----------
export async function saveSiteContent(fd: FormData) {
  await requireAdmin();

  const id = str(fd, "id");
  const section = str(fd, "section").toLowerCase();
  const title = str(fd, "title");

  if (!section || !title) return;

  const key =
    str(fd, "key") ||
    `${section}-${slugify(title)}-${Date.now()}`;

  const data = {
    section,
    key,
    label: str(fd, "label") || null,
    title,
    subtitle: str(fd, "subtitle") || null,
    body: str(fd, "body") || null,
    image: str(fd, "image") || null,
    videoUrl: str(fd, "videoUrl") || null,
    link: str(fd, "link") || null,
    sortOrder: num(fd, "sortOrder") ?? 0,
    active: fd.get("active") === "on",
  };

  if (id) {
    await db.siteContent.update({
      where: { id },
      data,
    });
  } else {
    await db.siteContent.create({
      data,
    });
  }

  // Refresh homepage
  revalidatePath("/");

  // Refresh admin CMS page
  revalidatePath("/admin/content");

  redirect("/admin/content");
}

export async function deleteSiteContent(fd: FormData) {
  await requireAdmin();
  await db.siteContent.delete({ where: { id: str(fd, "id") } });
  done("/admin/content");
}

// ---------- dedicated homepage modules ----------
export async function saveBanner(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id"); const title = str(fd, "title"); if (!title) return;
  const image = str(fd, "image") || null; const mobileImage = str(fd, "mobileImage") || null;
  const data = { section:"banner", key: str(fd,"key") || `banner-${slugify(title)}-${Date.now()}`, label:str(fd,"label")||null, title, subtitle:str(fd,"subtitle")||null, body:null, image, mobileImage, buttonText:str(fd,"buttonText")||"Explore homes", videoUrl:null, link:str(fd,"link")||"/stays", sortOrder:num(fd,"sortOrder")??0, active:fd.get("active")==="on" };
  if (id) await db.siteContent.update({where:{id},data}); else await db.siteContent.create({data});
  revalidatePath("/"); revalidatePath("/admin/banners"); redirect("/admin/banners");
}
export async function deleteBanner(fd: FormData) { await requireAdmin(); await db.siteContent.delete({where:{id:str(fd,"id")}}); revalidatePath("/"); revalidatePath("/admin/banners"); }

export async function saveFaq(fd: FormData) { await requireAdmin(); const id=str(fd,"id"); const question=str(fd,"question"); const answer=str(fd,"answer"); if(!question||!answer)return; const data={question,answer,sortOrder:num(fd,"sortOrder")??0,active:fd.get("active")==="on"}; if(id) await db.faq.update({where:{id},data}); else await db.faq.create({data}); revalidatePath("/"); revalidatePath("/admin/faqs"); redirect("/admin/faqs"); }
export async function deleteFaq(fd: FormData) { await requireAdmin(); await db.faq.delete({where:{id:str(fd,"id")}}); revalidatePath("/"); revalidatePath("/admin/faqs"); }

export async function saveInstagram(fd: FormData) { await requireAdmin(); const id=str(fd,"id"); const title=str(fd,"title"); const videoUrl=str(fd,"videoUrl"); if(!title||!videoUrl)return; const data={section:"instagram",key:id?undefined:`instagram-${slugify(title)}-${Date.now()}`,label:str(fd,"label")||null,title,subtitle:null,body:null,image:str(fd,"image")||null,videoUrl,link:videoUrl,sortOrder:num(fd,"sortOrder")??0,active:fd.get("active")==="on"}; if(id){const {key:_,...update}=data; await db.siteContent.update({where:{id},data:update});} else await db.siteContent.create({data}); revalidatePath("/"); revalidatePath("/admin/instagram"); redirect("/admin/instagram"); }
export async function deleteInstagram(fd: FormData) { await requireAdmin(); await db.siteContent.delete({where:{id:str(fd,"id")}}); revalidatePath("/"); revalidatePath("/admin/instagram"); }

export async function saveTestimonial(fd: FormData) { await requireAdmin(); const id=str(fd,"id"); const name=str(fd,"name"); const quote=str(fd,"quote"); if(!name||!quote)return; const data={name,location:str(fd,"location")||null,quote,rating:Math.min(5,Math.max(1,num(fd,"rating")??5)),source:str(fd,"source")||"DIRECT",sourceUrl:str(fd,"sourceUrl")||null,sortOrder:num(fd,"sortOrder")??0,active:fd.get("active")==="on"}; if(id) await db.testimonial.update({where:{id},data}); else await db.testimonial.create({data}); revalidatePath("/"); revalidatePath("/admin/testimonials"); redirect("/admin/testimonials"); }
export async function deleteTestimonial(fd: FormData) { await requireAdmin(); await db.testimonial.delete({where:{id:str(fd,"id")}}); revalidatePath("/"); revalidatePath("/admin/testimonials"); }

export async function saveBlog(fd: FormData) { await requireAdmin(); const id=str(fd,"id"); const title=str(fd,"title"); if(!title)return; let slug=slugify(str(fd,"slug")||title); const existing=await db.blog.findUnique({where:{slug}}); if(existing&&existing.id!==id) slug=`${slug}-${Date.now()}`; const published=fd.get("published")==="on"; const publishedAt=str(fd,"publishedAt"); const data={title,slug,category:str(fd,"category")||"Vrindavan",author:str(fd,"author")||"Vrindavan Holiday Inn",coverImage:str(fd,"coverImage")||null,excerpt:str(fd,"excerpt")||null,body:str(fd,"body"),seoTitle:str(fd,"seoTitle")||null,seoDescription:str(fd,"seoDescription")||null,featured:fd.get("featured")==="on",published,publishedAt:publishedAt?new Date(`${publishedAt}T12:00:00+05:30`):published?new Date():null}; if(id) await db.blog.update({where:{id},data}); else await db.blog.create({data}); revalidatePath("/"); revalidatePath("/blog"); revalidatePath(`/blog/${slug}`); revalidatePath("/admin/blogs"); redirect("/admin/blogs"); }
export async function deleteBlog(fd: FormData) { await requireAdmin(); await db.blog.delete({where:{id:str(fd,"id")}}); revalidatePath("/"); revalidatePath("/blog"); revalidatePath("/admin/blogs"); }
