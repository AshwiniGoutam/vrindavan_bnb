"use client";
import { useState } from "react";

export default function ResendVerification() {
  const [msg, setMsg] = useState("");
  return (
    <span>
      <button className="font-semibold underline underline-offset-4" onClick={async () => {
        const r = await fetch("/api/auth/resend-verification", { method: "POST" });
        const d = await r.json().catch(() => ({}));
        setMsg(r.ok ? "Sent. Check your inbox." : d.error ?? "Couldn't send.");
      }}>Resend the email</button>
      {msg && <span className="ml-2">{msg}</span>}
    </span>
  );
}
