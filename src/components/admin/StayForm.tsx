import { amenityCatalog } from "@/lib/amenities";
import { stayTypes } from "@/lib/config";
import ImageUploader from "./ImageUploader";
import type { CollectionItem } from "@/lib/content";
import { saveStay } from "@/app/admin/actions";
import type { Stay } from "@/lib/db";

const Num = ({ name, label, def, hint }: { name: string; label: string; def?: number | null; hint?: string }) => (
  <div><label className="label" htmlFor={name}>{label}</label><input id={name} name={name} type="number" min={0} defaultValue={def ?? ""} className="field" />{hint && <p className="mt-1 text-xs text-stone">{hint}</p>}</div>
);
const Txt = ({ name, label, def, required }: { name: string; label: string; def?: string | null; required?: boolean }) => (
  <div><label className="label" htmlFor={name}>{label}</label><input id={name} name={name} defaultValue={def ?? ""} required={required} className="field" /></div>
);
const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="rounded-2xl bg-white p-6 shadow-sm"><legend className="float-left mb-4 font-sans text-lg font-semibold">{title}</legend><div className="clear-both grid gap-4">{children}</div></fieldset>
);

export default function StayForm({ stay, collections }: { stay?: Stay; collections: CollectionItem[] }) {
  return (
    <form action={saveStay} className="grid max-w-4xl gap-6">
      {stay && <input type="hidden" name="id" value={stay.id} />}

      <Card title="Basics">
        <Txt name="title" label="Name of the stay" def={stay?.title} required />
        {!stay && <Txt name="slug" label="URL slug (optional, made from the name if empty)" />}
        <Txt name="tagline" label="One-line tagline" def={stay?.tagline} />
        <div><label className="label" htmlFor="description">Description</label><textarea id="description" name="description" rows={6} defaultValue={stay?.description} required className="field" /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="label" htmlFor="type">Type</label><select id="type" name="type" defaultValue={stay?.type ?? "Villa"} className="field">{stayTypes.map((t) => <option key={t}>{t}</option>)}</select></div>
          <Txt name="city" label="City" def={stay?.city} required />
          <Txt name="state" label="State" def={stay?.state} required />
        </div>
        <Txt name="address" label="Area or landmark (shown publicly, full address is shared after booking)" def={stay?.address} />
      </Card>

      <Card title="Photos">
        <ImageUploader initial={stay?.images ?? []} />
      </Card>

      <Card title="Capacity">
        <div className="grid gap-4 sm:grid-cols-4">
          <Num name="bedrooms" label="Bedrooms" def={stay?.bedrooms ?? 1} />
          <Num name="bathrooms" label="Bathrooms" def={stay?.bathrooms ?? 1} />
          <Num name="baseGuests" label="Guests included" def={stay?.baseGuests ?? 2} />
          <Num name="maxGuests" label="Max guests" def={stay?.maxGuests ?? 4} />
        </div>
      </Card>

      <Card title="Pricing (₹ per night)">
        <div className="grid gap-4 sm:grid-cols-3">
          <Num name="basePrice" label="Weekday price" def={stay?.basePrice} />
          <Num name="weekendPrice" label="Fri and Sat price" def={stay?.weekendPrice} hint="Leave empty to use the weekday price." />
          <Num name="minNights" label="Minimum nights" def={stay?.minNights ?? 1} />
          <Num name="extraGuestFee" label="Extra guest, per night" def={stay?.extraGuestFee ?? 0} />
          <Num name="cleaningFee" label="Cleaning fee, one time" def={stay?.cleaningFee ?? 0} />
        </div>
      </Card>

      <Card title="Features">
        <div>
          <p className="label">Amenities</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {amenityCatalog.map((a) => (
              <label key={a.key} className="flex items-center gap-2 text-sm"><input type="checkbox" name="amenities" value={a.key} defaultChecked={stay?.amenities.includes(a.key)} /> {a.label}</label>
            ))}
          </div>
        </div>
        <div>
          <p className="label">Show in collections</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {collections.map((c) => (
              <label key={c.slug} className="flex items-center gap-2 text-sm"><input type="checkbox" name="collections" value={c.slug} defaultChecked={stay?.collections.includes(c.slug)} /> {c.title}</label>
            ))}
          </div>
        </div>
      </Card>

      <Card title="House details">
        <div className="grid gap-4 sm:grid-cols-2"><Txt name="checkInTime" label="Check-in time" def={stay?.checkInTime ?? "14:00"} /><Txt name="checkOutTime" label="Check-out time" def={stay?.checkOutTime ?? "11:00"} /></div>
        <div><label className="label" htmlFor="rules">House rules</label><textarea id="rules" name="rules" rows={4} defaultValue={stay?.rules ?? ""} className="field" /></div>
        <div className="grid gap-4 sm:grid-cols-2"><Num name="reviewCount" label="Review count" def={stay?.reviewCount ?? 0} /><div><label className="label" htmlFor="rating">Rating (0 to 5)</label><input id="rating" name="rating" type="number" step="0.1" min={0} max={5} defaultValue={stay?.rating ?? 4.8} className="field" /></div></div>
      </Card>

      <Card title="Visibility">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={stay?.published ?? true} /> Published (guests can see and book it)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={stay?.featured ?? false} /> Featured on the home page</label>
      </Card>

      <div className="flex gap-3"><button className="btn btn-primary">{stay ? "Save changes" : "Add stay"}</button></div>
    </form>
  );
}
