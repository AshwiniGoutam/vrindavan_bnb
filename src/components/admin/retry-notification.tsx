"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetryNotificationButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button className="text-xs underline" disabled={busy} onClick={async () => { setBusy(true); await fetch(`/api/admin/notifications/${id}`, { method: "POST" }); setBusy(false); router.refresh(); }}>
      {busy ? "Sending…" : "Retry now"}
    </button>
  );
}
