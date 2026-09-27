"use client";

import { useState } from "react";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: f.get("email"), password: f.get("password") }) });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ok) window.location.assign("/admin");
    else {
      setBusy(false);
      setError(json?.error?.message ?? "Sign-in failed.");
    }
  }
  return (
    <form onSubmit={submit} className="mt-10 space-y-5">
      <label className="field">
        <span className="field-label">Email</span>
        <input name="email" type="email" required autoComplete="username" className="input" />
      </label>
      <label className="field">
        <span className="field-label">Password</span>
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
