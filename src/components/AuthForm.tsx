"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(f);
    if (mode === "register") body.consent = f.get("consent") === "on";
    const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setError(d.error ?? "Something went wrong"); setBusy(false); return; }
    router.push(next);
    router.refresh();
  }

  const isReg = mode === "register";
  return (
    <form onSubmit={submit} className="grid gap-4">
      {isReg && <div><label className="label" htmlFor="name">Full name</label><input id="name" name="name" className="field" autoComplete="name" required /></div>}
      <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" className="field" autoComplete="email" required /></div>
      {isReg && (
        <div><label className="label" htmlFor="phone">Mobile number</label><input id="phone" name="phone" type="tel" className="field" autoComplete="tel" placeholder="+91 98765 43210" required />
          <p className="mt-1 text-xs text-stone">We send booking confirmations on WhatsApp.</p></div>
      )}
      <div>
        <div className="flex items-baseline justify-between"><label className="label" htmlFor="password">Password</label>
          {!isReg && <Link href="/forgot-password" className="text-xs text-stone underline underline-offset-4">Forgot password?</Link>}</div>
        <input id="password" name="password" type="password" className="field" autoComplete={isReg ? "new-password" : "current-password"} minLength={isReg ? 8 : 1} required />
      </div>
      {isReg && (
        <label className="flex items-start gap-2 text-sm text-stone">
          <input type="checkbox" name="consent" className="mt-1" required />
          <span>I agree to the <Link href="/terms" target="_blank" className="underline">Terms</Link> and the <Link href="/privacy" target="_blank" className="underline">Privacy Policy</Link>.</span>
        </label>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? "Please wait…" : isReg ? "Create account" : "Log in"}</button>
      <p className="text-center text-sm text-stone">
        {isReg ? "Already have an account? " : "New here? "}
        <Link className="font-semibold text-pine underline underline-offset-4" href={`/${isReg ? "login" : "register"}?next=${encodeURIComponent(next)}`}>{isReg ? "Log in" : "Create an account"}</Link>
      </p>
    </form>
  );
}
