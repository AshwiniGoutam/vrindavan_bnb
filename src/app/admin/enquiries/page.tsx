import { Mail, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { updateEnquiryStatus } from "../actions";
import StatusSelect from "@/components/admin/StatusSelect";
import { waLink } from "@/lib/config";
import { normalizePhone } from "@/lib/notify";

export const metadata = { title: "Enquiries" };
export const dynamic = "force-dynamic";

const topicLabel: Record<string, string> = { stay: "Stay help", group: "Group stay", "list-property": "Wants to list property", other: "Other" };

export default async function AdminEnquiries() {
  const items = await db.enquiry.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { stay: { select: { title: true } } } });
  return (
    <div>
      <h1 className="text-3xl">Enquiries</h1>
      <ul className="mt-6 grid gap-4">
        {items.map((e) => (
          <li key={e.id} className={`rounded-2xl bg-white p-5 shadow-sm ${e.status === "NEW" ? "ring-2 ring-marigold" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{e.name} <span className="ml-2 rounded-full bg-mist px-2.5 py-0.5 text-xs font-medium">{topicLabel[e.topic] ?? e.topic}</span></p>
                <p className="text-sm text-stone">{e.phone} · {e.email} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(e.createdAt)}</p>
              </div>
              <form action={updateEnquiryStatus}><input type="hidden" name="id" value={e.id} /><StatusSelect value={e.status} options={["NEW", "CONTACTED", "CLOSED"]} /></form>
            </div>
            <p className="mt-3 whitespace-pre-line">{e.message}</p>
            {(e.checkIn || e.guests || e.stay) && (
              <p className="mt-2 text-sm text-stone">{e.stay?.title}{e.checkIn ? ` · ${e.checkIn} to ${e.checkOut ?? "?"}` : ""}{e.guests ? ` · ${e.guests} guests` : ""}</p>
            )}
            <div className="mt-4 flex gap-2">
              <a className="btn btn-ghost !px-4 !py-2 text-sm" target="_blank" rel="noreferrer" href={waLink(`Hi ${e.name}, thanks for reaching out.`, normalizePhone(e.phone))}><MessageCircle size={15} /> WhatsApp</a>
              <a className="btn btn-ghost !px-4 !py-2 text-sm" href={`mailto:${e.email}`}><Mail size={15} /> Email</a>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="rounded-2xl bg-white p-10 text-center text-stone">No enquiries yet.</li>}
      </ul>
    </div>
  );
}
