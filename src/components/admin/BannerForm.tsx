"use client";
import ImageUploader from "./ImageUploader";

export default function BannerForm({ action, banner }: { action: (fd: FormData) => void; banner?: any }) {
  return <form action={action} className="grid gap-4">
    {banner?.id && <input type="hidden" name="id" value={banner.id} />}
    <div className="grid gap-4 lg:grid-cols-2">
      <div><label className="label">Desktop image</label><ImageUploader initial={banner?.image ? [banner.image] : []} name="image" /></div>
      <div><label className="label">Mobile image <span className="text-stone">(optional)</span></label><ImageUploader initial={banner?.mobileImage ? [banner.mobileImage] : []} name="mobileImage" /></div>
    </div>
    <div className="grid gap-3 md:grid-cols-2">
      <div><label className="label">Label</label><input name="label" defaultValue={banner?.label ?? ""} placeholder="VHI VRINDAVAN" className="field" /></div>
      <div><label className="label">Heading</label><input name="title" defaultValue={banner?.title ?? ""} placeholder="Your private home in Vrindavan" className="field" required /></div>
    </div>
    <div><label className="label">Description</label><textarea name="subtitle" defaultValue={banner?.subtitle ?? ""} className="field min-h-24" /></div>
    <div className="grid gap-3 md:grid-cols-3">
      <div><label className="label">Button text</label><input name="buttonText" defaultValue={banner?.buttonText ?? "Explore homes"} className="field" /></div>
      <div><label className="label">Button link</label><input name="link" defaultValue={banner?.link ?? "/stays"} className="field" /></div>
      <div><label className="label">Sort order</label><input name="sortOrder" type="number" defaultValue={banner?.sortOrder ?? 0} className="field" /></div>
    </div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={banner ? banner.active : true} /> Show this banner</label>
    <button className="btn btn-primary w-fit">{banner ? "Save banner" : "Add banner"}</button>
  </form>;
}
