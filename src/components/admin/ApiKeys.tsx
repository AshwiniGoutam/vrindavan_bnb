"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";

type Key = { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };

export default function ApiKeys({ keys }: { keys: Key[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState("");
  const [error, setError] = useState("");
  const fmt = (s: string | null) => (s ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(s)) : "Never");

  return (
    <div>
      <form className="flex gap-2" onSubmit={async (e) => {
        e.preventDefault(); setError("");
        const r = await fetch("/api/admin/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
        const d = await r.json();
        if (r.ok) { setFresh(d.key); setName(""); router.refresh(); } else setError(d.error);
      }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name, e.g. Zapier" aria-label="Key name" className="field !py-2 text-sm" required />
        <button className="btn btn-primary !py-2 text-sm">Create key</button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-red-800">{error}</p>}
      {fresh && (
        <div className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Copy this key now. You won't be able to see it again.</p>
          <div className="mt-2 flex items-center gap-2"><code className="break-all rounded bg-white px-2 py-1">{fresh}</code>
            <button type="button" className="btn btn-ghost !p-2" aria-label="Copy key" onClick={() => navigator.clipboard.writeText(fresh)}><Copy size={14} /></button></div>
        </div>
      )}
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line text-sm">
        {keys.map((k) => (
          <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div><p className="font-semibold">{k.name} <code className="ml-1 text-xs font-normal text-stone">{k.prefix}…</code></p><p className="text-xs text-stone">Created {fmt(k.createdAt)} · Last used {fmt(k.lastUsedAt)}</p></div>
            {k.revokedAt ? <span className="text-xs text-stone">Revoked</span> : (
              <button className="text-xs text-red-700 underline" onClick={async () => { if (!confirm(`Revoke "${k.name}"? Anything using it stops working.`)) return; await fetch("/api/admin/api-keys", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: k.id }) }); router.refresh(); }}>Revoke</button>
            )}
          </li>
        ))}
        {keys.length === 0 && <li className="p-4 text-center text-stone">No API keys yet.</li>}
      </ul>
    </div>
  );
}
