import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteCollection, deleteDestination, loadDefaultContent, saveCollection, saveDestination, deleteSiteContent, saveSiteContent } from "../more-actions";
import ConfirmButton from "@/components/admin/ConfirmButton";

export const metadata = { title: "Content" };
export const dynamic = "force-dynamic";

export default async function Content() {
  const [collections, destinations, siteContent] = await Promise.all([
    db.collection.findMany({ orderBy: [{ sortOrder: "asc" }, { title: "asc" }] }),
    db.destination.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.siteContent.findMany({ orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { title: "asc" }] }),
  ]);
  const empty = collections.length === 0 && destinations.length === 0;
  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl">Site content</h1>
        <p className="mt-2 max-w-2xl text-stone">Collections are the "kind of trip" cards on the home page and the filters on the stays page. Destinations are the city chips. Stays are tagged with collections on their edit page.</p>
        {empty && (
          <form action={loadDefaultContent} className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            The site is showing built-in defaults. <button className="ml-1 font-semibold underline underline-offset-4">Copy the defaults here so I can edit them</button>
          </form>
        )}
      </div>

      <section>
        <h2 className="mb-3 font-sans text-xl font-semibold">Collections</h2>
        <div className="grid gap-3">
          {collections.map((c) => (
            <div key={c.id} className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <form action={saveCollection} className="grid flex-1 gap-3 sm:grid-cols-[1fr_1.4fr_1.6fr_70px_auto_auto] sm:items-end">
                <input type="hidden" name="id" value={c.id} />
                <div><label className="label">Title</label><input name="title" defaultValue={c.title} className="field !py-2 text-sm" required /></div>
                <div><label className="label">Short line</label><input name="blurb" defaultValue={c.blurb} className="field !py-2 text-sm" /></div>
                <div><label className="label">Image link</label><input name="image" defaultValue={c.image ?? ""} className="field !py-2 text-sm" /></div>
                <div><label className="label">Order</label><input name="sortOrder" type="number" defaultValue={c.sortOrder} className="field !py-2 text-sm" /></div>
                <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={c.active} /> Show</label>
                <button className="btn btn-primary !py-2 text-sm">Save</button>
              </form>
              <form action={deleteCollection}><input type="hidden" name="id" value={c.id} /><ConfirmButton message={`Delete "${c.title}"?`} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><Trash2 size={16} /></ConfirmButton></form>
              <p className="w-full text-xs text-stone">Tag slug: <code>{c.slug}</code></p>
            </div>
          ))}
          <form action={saveCollection} className="grid gap-3 rounded-2xl border border-dashed border-line p-4 sm:grid-cols-[1fr_1.4fr_1.6fr_auto] sm:items-end">
            <input type="hidden" name="active" value="on" />
            <div><label className="label">New collection</label><input name="title" placeholder="Title" className="field !py-2 text-sm" required /></div>
            <div><label className="label">Short line</label><input name="blurb" className="field !py-2 text-sm" /></div>
            <div><label className="label">Image link</label><input name="image" className="field !py-2 text-sm" /></div>
            <button className="btn btn-ghost !py-2 text-sm">Add</button>
          </form>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="font-sans text-xl font-semibold">Homepage content</h2><p className="mt-1 text-sm text-stone">Every editable homepage block lives here. Add Instagram Reel URLs, change copy/images, reorder cards, or hide sections without touching code.</p></div>
        </div>
        <div className="grid gap-3">
          {siteContent.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <form action={saveSiteContent} className="grid gap-3 lg:grid-cols-[100px_150px_1fr_1fr_1fr_80px_auto] lg:items-end">
                <input type="hidden" name="id" value={c.id} />
                <div><label className="label">Section</label><input name="section" defaultValue={c.section} className="field !py-2 text-sm" required /></div>
                <div><label className="label">Key</label><input name="key" defaultValue={c.key} className="field !py-2 text-sm" required /></div>
                <div><label className="label">Title</label><input name="title" defaultValue={c.title} className="field !py-2 text-sm" required /></div>
                <div><label className="label">Subtitle</label><input name="subtitle" defaultValue={c.subtitle ?? ""} className="field !py-2 text-sm" /></div>
                <div><label className="label">Image / video URL</label><input name="image" defaultValue={c.image ?? ""} className="field !py-2 text-sm" /></div>
                <div><label className="label">Order</label><input name="sortOrder" type="number" defaultValue={c.sortOrder} className="field !py-2 text-sm" /></div>
                <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={c.active} /> Show</label>
                <div className="lg:col-span-4"><label className="label">Body</label><textarea name="body" defaultValue={c.body ?? ""} className="field min-h-20 !py-2 text-sm" /></div>
                <div className="lg:col-span-2"><label className="label">Instagram / video URL</label><input name="videoUrl" defaultValue={c.videoUrl ?? ""} placeholder="https://www.instagram.com/reel/.../" className="field !py-2 text-sm" /></div>
                <div><label className="label">Link</label><input name="link" defaultValue={c.link ?? ""} className="field !py-2 text-sm" /></div>
                <button className="btn btn-primary !py-2 text-sm">Save</button>
              </form>
              <div className="mt-2 flex justify-end"><form action={deleteSiteContent}><input type="hidden" name="id" value={c.id} /><ConfirmButton message={`Delete "${c.title}"?`} className="rounded-lg px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"><Trash2 size={14} /></ConfirmButton></form></div>
            </div>
          ))}
          <form action={saveSiteContent} className="grid gap-3 rounded-2xl border border-dashed border-line p-4 lg:grid-cols-5 lg:items-end">
            <div><label className="label">Section</label><input name="section" placeholder="instagram / offer / story" className="field !py-2 text-sm" required /></div>
            <div><label className="label">Title</label><input name="title" placeholder="Title" className="field !py-2 text-sm" required /></div>
            <div><label className="label">Image</label><input name="image" className="field !py-2 text-sm" /></div>
            <div><label className="label">Instagram / video URL</label><input name="videoUrl" className="field !py-2 text-sm" /></div>
            <button className="btn btn-ghost !py-2 text-sm">Add block</button>
            <input type="hidden" name="active" value="on" />
          </form>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-sans text-xl font-semibold">Destinations</h2>
        <div className="grid gap-2">
          {destinations.map((d) => (
            <div key={d.id} className="flex items-end gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <form action={saveDestination} className="flex flex-1 flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={d.id} />
                <div className="flex-1"><label className="label">City</label><input name="name" defaultValue={d.name} className="field !py-2 text-sm" required /></div>
                <div className="w-20"><label className="label">Order</label><input name="sortOrder" type="number" defaultValue={d.sortOrder} className="field !py-2 text-sm" /></div>
                <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={d.active} /> Show</label>
                <button className="btn btn-primary !py-2 text-sm">Save</button>
              </form>
              <form action={deleteDestination}><input type="hidden" name="id" value={d.id} /><ConfirmButton message={`Remove ${d.name}?`} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><Trash2 size={16} /></ConfirmButton></form>
            </div>
          ))}
          <form action={saveDestination} className="flex items-end gap-3 rounded-2xl border border-dashed border-line p-3">
            <input type="hidden" name="active" value="on" />
            <div className="flex-1"><label className="label">New destination</label><input name="name" placeholder="City name" className="field !py-2 text-sm" required /></div>
            <button className="btn btn-ghost !py-2 text-sm">Add</button>
          </form>
        </div>
      </section>
    </div>
  );
}
