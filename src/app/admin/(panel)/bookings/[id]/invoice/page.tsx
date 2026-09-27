import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { requireAdmin } from "@/server/auth/session";
import { connectDB } from "@/server/db/connect";
import { Booking } from "@/server/models";
import { getSettings } from "@/server/services/settings.service";
import { formatINR } from "@/lib/money";
import { PrintButton } from "@/components/admin/print-button";

export const metadata = { title: "Invoice" };

/** Printable tax invoice (browser "Save as PDF"). Confirm the format and SAC codes with the client's CA. */
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("bookings.view");
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = await Booking.findById(id).lean<any>();
  if (!b?.invoiceNumber) notFound();
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-sm text-ink print:p-0">
      <div className="no-print mb-6"><PrintButton /></div>
      <div className="flex items-start justify-between border-b pb-6">
        <div>
          <img src="/brand/vhi-logo-dark.png" alt="VHI" className="h-12 w-auto" />
          <p className="mt-3 font-medium">{s.business.legalName || s.business.brandName}</p>
          <p className="whitespace-pre-line text-muted">{s.business.invoiceAddress || s.business.registeredAddress}</p>
          {s.business.gstin ? <p>GSTIN: {s.business.gstin}</p> : null}
        </div>
        <div className="text-right">
          <p className="display text-3xl">Tax invoice</p>
          <p className="mt-2">No. {b.invoiceNumber}</p>
          <p>Date {new Date(b.updatedAt).toLocaleDateString("en-IN")}</p>
          <p>Booking {b.code}</p>
        </div>
      </div>
      <div className="py-6">
        <p className="field-label">Billed to</p>
        <p className="mt-1">{b.guest.name} · {b.guest.phone}{b.guest.email ? ` · ${b.guest.email}` : ""}</p>
        {b.guest.gstin ? <p>GSTIN: {b.guest.gstin}</p> : null}
      </div>
      <table className="w-full">
        <thead><tr className="border-y text-left text-xs"><th className="py-2">Description</th><th className="py-2 text-right">Taxable</th><th className="py-2 text-right">GST</th><th className="py-2 text-right">Amount</th></tr></thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {b.pricing.lines.map((l: any, i: number) => (
            <tr key={i} className="border-b"><td className="py-2">{l.label}</td><td className="py-2 text-right">{formatINR(l.taxable)}</td><td className="py-2 text-right">{l.gstRate}% · {formatINR(l.gstAmount)}</td><td className="py-2 text-right">{formatINR(l.taxable + l.gstAmount)}</td></tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td className="pt-4" colSpan={3}>Discount</td><td className="pt-4 text-right">−{formatINR(b.pricing.discountTotal ?? 0)}</td></tr>
          <tr><td colSpan={3}>Total GST</td><td className="text-right">{formatINR(b.pricing.gstTotal)}</td></tr>
          <tr className="text-base font-semibold"><td colSpan={3} className="pt-2">Total paid</td><td className="pt-2 text-right">{formatINR(b.pricing.total)}</td></tr>
        </tfoot>
      </table>
      <p className="mt-10 text-xs text-muted">This is a computer-generated invoice.</p>
    </div>
  );
}
