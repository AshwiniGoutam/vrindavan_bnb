"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/money";

async function act(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/admin/bookings/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

export function BookingAdminActions({ id, status, canRefund, canManage, refundable }: { id: string; status: string; canRefund: boolean; canManage: boolean; refundable: number }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [calc, setCalc] = useState<{ refundAmount: number; refundPercent: number; daysBefore: number } | null>(null);
  const [calcNote, setCalcNote] = useState<string | null>(null);
  const [refund, setRefund] = useState(0);
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);

  const run = async (body: Record<string, unknown>, ok = "Done") => {
    setBusy(true);
    const j = await act(id, body);
    setBusy(false);
    setMsg(j.ok ? ok : j.error?.message ?? "Failed");
    if (j.ok) router.refresh();
    return j;
  };

  async function openCancel() {
    setCancelOpen(true);
    const j = await act(id, { action: "cancel-preview" });
    if (j.ok && j.data.calc) {
      setCalc(j.data.calc);
      setRefund(canRefund ? j.data.calc.refundAmount : 0);
    } else setCalcNote(j.data?.reason ?? j.error?.message ?? null);
  }

  if (!canManage) return null;
  return (
    <section className="space-y-4 border hairline bg-paper p-6">
      <p className="field-label">Actions</p>
      <div className="flex flex-wrap gap-2">
        {status === "confirmed" ? <button className="btn btn-primary !py-2.5" disabled={busy} onClick={() => run({ action: "status", to: "checked_in" }, "Checked in")}>Check in</button> : null}
        {status === "checked_in" ? <button className="btn btn-primary !py-2.5" disabled={busy} onClick={() => run({ action: "status", to: "checked_out" }, "Checked out")}>Check out</button> : null}
        {status === "confirmed" ? <button className="btn btn-outline !py-2.5" disabled={busy} onClick={() => run({ action: "resend" }, "Notifications re-sent")}>Resend confirmations</button> : null}
        {["confirmed", "pending_payment"].includes(status) ? <button className="btn btn-outline !py-2.5 !text-danger" onClick={openCancel}>Cancel booking</button> : null}
      </div>

      {cancelOpen ? (
        <div className="space-y-3 border-t hairline pt-4">
          {calc ? <p className="text-sm">Policy: {calc.daysBefore} days before → {calc.refundPercent}% · suggested refund <b>{formatINR(calc.refundAmount)}</b></p> : calcNote ? <p className="text-sm text-muted">{calcNote}</p> : <p className="text-sm text-muted">Calculating…</p>}
          <label className="field">
            <span className="field-label">Refund amount (max {formatINR(refundable)})</span>
            <input type="number" className="input" disabled={!canRefund} min={0} max={refundable / 100} value={refund / 100} onChange={(e) => setRefund(Math.round(Number(e.target.value) * 100))} />
            {!canRefund ? <span className="text-xs text-muted">Only owners/managers can refund.</span> : null}
          </label>
          <label className="field"><span className="field-label">Reason</span><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-charcoal" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Notify guest</label>
          <button className="btn btn-primary !py-2.5" disabled={busy || reason.trim().length < 3} onClick={async () => { const j = await run({ action: "cancel", reason, refundAmount: refund, notifyGuest: notify }, "Cancelled"); if (j.ok) setCancelOpen(false); }}>
            Confirm cancellation{refund ? ` & refund ${formatINR(refund)}` : ""}
          </button>
        </div>
      ) : null}

      <div className="space-y-2 border-t hairline pt-4">
        <textarea className="input min-h-20 text-sm" placeholder="Add an internal note…" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn btn-outline !py-2" disabled={!note.trim() || busy} onClick={async () => { const j = await run({ action: "note", text: note }, "Note added"); if (j.ok) setNote(""); }}>Add note</button>
      </div>
      {msg ? <p className="text-sm text-muted">{msg}</p> : null}
    </section>
  );
}
