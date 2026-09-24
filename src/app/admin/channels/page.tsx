import Link from "next/link";
import { CheckCircle2, RefreshCw, Trash2, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { addFeed, removeFeed, syncAll, syncOne } from "../actions";
import { channexPullNow, channexPushStay, saveChannexMapping } from "../more-actions";
import { channexEnabled } from "@/lib/channex";
import CopyField from "@/components/admin/CopyField";
import { site } from "@/lib/config";

export const metadata = { title: "Channels" };
export const dynamic = "force-dynamic";

const when = (d: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

export default async function Channels() {
  const [stays, logs] = await Promise.all([
    db.stay.findMany({ orderBy: { title: "asc" }, include: { feeds: { include: { _count: { select: { blocks: true } } } } } }),
    db.channelLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const cx = channexEnabled();
  const mapped = stays.filter((s) => s.channexPropertyId && s.channexRoomTypeId).length;

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl">Channels</h1>
        <p className="mt-2 max-w-3xl text-stone">Sell on Airbnb, Booking.com, MakeMyTrip, Goibibo and others without double bookings. Use a channel manager for instant sync, calendar links as a simpler fallback, or both.</p>
      </div>

      {/* ---------------- Channex ---------------- */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-sans text-xl font-semibold">Real-time sync with Channex {cx ? <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-900">API key set</span> : <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-900">Not connected</span>}</h2>
            <p className="mt-1 max-w-2xl text-sm text-stone">Channex connects to the OTAs for you. Bookings made on any channel arrive here within seconds, and every booking, block, price or minimum-stay change made here is pushed back out.</p>
          </div>
          <form action={channexPullNow}><button className="btn btn-ghost !py-2 text-sm" disabled={!cx}><RefreshCw size={15} /> Pull bookings now</button></form>
        </div>

        {!cx ? (
          <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-stone">
            <li>Create a Channex account (they have a free sandbox at staging.channex.io to test with) and make an API key in your profile.</li>
            <li>Add <code>CHANNEX_API_KEY</code>, <code>CHANNEX_WEBHOOK_SECRET</code> (any long random string) and, for the sandbox, <code>CHANNEX_BASE_URL=https://staging.channex.io/api/v1</code> to your environment variables, then redeploy.</li>
            <li>In Channex, create one property per villa, with one room type (1 unit) and one rate plan, currency INR.</li>
            <li>Connect your Airbnb, Booking.com and MakeMyTrip/Goibibo accounts to those properties in Channex, and map each listing to the room type and rate plan.</li>
            <li>Come back here, paste the three IDs per villa below, and press Push.</li>
          </ol>
        ) : (
          <div className="mt-5 rounded-xl bg-mist p-4 text-sm">
            <p className="font-semibold">Webhook URL for Channex (event: booking)</p>
            <div className="mt-2"><CopyField path={`${site.url}/api/webhooks/channex?secret=YOUR_CHANNEX_WEBHOOK_SECRET`} /></div>
            <p className="mt-2 text-xs text-stone">Replace YOUR_CHANNEX_WEBHOOK_SECRET with the value you set. If the webhook is ever missed, the daily job and the Pull button catch up. {mapped} of {stays.length} stays mapped.</p>
          </div>
        )}

        <div className="mt-6 grid gap-4">
          {stays.map((s) => {
            const ok = !!(s.channexPropertyId && s.channexRoomTypeId);
            return (
              <div key={s.id} className="rounded-xl border border-line p-4">
                <p className="flex items-center gap-2 font-semibold">{ok ? <CheckCircle2 size={16} className="text-emerald-700" /> : <XCircle size={16} className="text-stone" />}{s.title} <span className="font-normal text-stone">· {s.city}</span></p>
                <form action={saveChannexMapping} className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
                  <input type="hidden" name="stayId" value={s.id} />
                  <div><label className="label" htmlFor={`p-${s.id}`}>Property ID</label><input id={`p-${s.id}`} name="propertyId" defaultValue={s.channexPropertyId ?? ""} className="field !py-2 font-mono text-xs" placeholder="uuid" /></div>
                  <div><label className="label" htmlFor={`r-${s.id}`}>Room type ID</label><input id={`r-${s.id}`} name="roomTypeId" defaultValue={s.channexRoomTypeId ?? ""} className="field !py-2 font-mono text-xs" placeholder="uuid" /></div>
                  <div><label className="label" htmlFor={`t-${s.id}`}>Rate plan ID</label><input id={`t-${s.id}`} name="ratePlanId" defaultValue={s.channexRatePlanId ?? ""} className="field !py-2 font-mono text-xs" placeholder="uuid" /></div>
                  <button className="btn btn-ghost !py-2 text-sm">Save</button>
                </form>
                {ok && cx && (
                  <form action={channexPushStay} className="mt-3 flex items-center gap-3">
                    <input type="hidden" name="stayId" value={s.id} />
                    <button className="btn btn-primary !py-2 text-sm">Push availability and rates (next 12 months)</button>
                    <span className="text-xs text-stone">Sends what's on your calendar to every connected channel.</span>
                  </form>
                )}
              </div>
            );
          })}
        </div>

        <h3 className="mb-2 mt-8 font-sans text-base font-semibold">Recent sync activity</h3>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-mist text-stone"><tr><th className="p-3 font-medium">When</th><th className="font-medium">What</th><th className="font-medium">Result</th></tr></thead>
            <tbody className="divide-y divide-line">
              {logs.map((l) => (
                <tr key={l.id} className={l.ok ? "" : "bg-red-50/60"}>
                  <td className="whitespace-nowrap p-3">{when(l.createdAt)}</td>
                  <td className="whitespace-nowrap">{l.kind.replace("_", " ")}</td>
                  <td className={l.ok ? "" : "text-red-800"}>{l.message}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-stone">Nothing yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- iCal ---------------- */}
      <section className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-sans text-xl font-semibold">Calendar links (iCal)</h2>
            <p className="mt-1 max-w-2xl text-sm text-stone">The simpler option, no channel manager needed. Paste each channel's calendar link here, and give each channel our link for that villa. Channels refresh links every 15 minutes to a few hours, so a rare double booking is possible. If a villa uses Channex above, prefer that.</p>
          </div>
          <form action={syncAll}><button className="btn btn-ghost !py-2 text-sm"><RefreshCw size={15} /> Sync all now</button></form>
        </div>

        {stays.map((s) => (
          <div key={s.id} className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="font-sans text-lg font-semibold">{s.title} <span className="font-normal text-stone">· {s.city}</span></h3>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="label">Our calendar link. Paste into each channel's "import calendar".</p>
                <CopyField path={`/api/ical/${s.icalToken}.ics`} />
              </div>
              <div>
                <p className="label">Channel calendars we import</p>
                <ul className="grid gap-2">
                  {s.feeds.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold">{f.name} <span className="font-normal text-stone">· {f._count.blocks} blocked ranges</span></p>
                        <p className="truncate text-xs text-stone">{f.lastError ? <span className="text-red-700">Error: {f.lastError}</span> : f.lastSyncedAt ? `Synced ${when(f.lastSyncedAt)}` : "Not synced yet"}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <form action={syncOne}><input type="hidden" name="id" value={f.id} /><button className="btn btn-ghost !p-2" aria-label={`Sync ${f.name}`}><RefreshCw size={14} /></button></form>
                        <form action={removeFeed}><input type="hidden" name="id" value={f.id} /><button className="btn btn-ghost !border-red-300 !p-2 !text-red-700" aria-label={`Remove ${f.name}`}><Trash2 size={14} /></button></form>
                      </div>
                    </li>
                  ))}
                </ul>
                <form action={addFeed} className="mt-3 grid gap-2 sm:grid-cols-[130px_1fr_auto]">
                  <input type="hidden" name="stayId" value={s.id} />
                  <select name="name" className="field !py-2 text-sm" aria-label="Channel">{["Airbnb", "Booking.com", "MakeMyTrip", "Goibibo", "Agoda", "Vrbo", "Other"].map((n) => <option key={n}>{n}</option>)}</select>
                  <input name="url" type="url" required placeholder="https://…/calendar.ics" className="field !py-2 text-sm" aria-label="Calendar URL" />
                  <button className="btn btn-primary !py-2 text-sm">Add</button>
                </form>
              </div>
            </div>
            <p className="mt-4 text-xs text-stone">To block dates yourself, use the <Link href={`/admin/calendar/${s.id}`} className="underline">calendar</Link>.</p>
          </div>
        ))}
        {stays.length === 0 && <p className="rounded-2xl bg-white p-10 text-center text-stone">Add a stay first, then connect its channels here.</p>}
      </section>
    </div>
  );
}
