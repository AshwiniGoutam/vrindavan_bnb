"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  return { ok: res.ok, error: (d.error as string | undefined) ?? "Something went wrong" };
}

const Alert = ({ error }: { error: string }) => (error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null);

export function ForgotPasswordForm() {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");
  if (state === "done") {
    return <div className="rounded-2xl bg-emerald-50 p-6 text-emerald-900"><CheckCircle2 className="mb-2" /><p>If an account exists for that email, we've sent a link to reset your password. It works for one hour.</p></div>;
  }
  return (
    <form className="grid gap-4" onSubmit={async (e) => {
      e.preventDefault(); setState("busy"); setError("");
      const r = await post("/api/auth/forgot", { email: new FormData(e.currentTarget).get("email") });
      if (r.ok) setState("done"); else { setError(r.error); setState("idle"); }
    }}>
      <div><label className="label" htmlFor="fe">Email</label><input id="fe" name="email" type="email" className="field" autoComplete="email" required /></div>
      <Alert error={error} />
      <button className="btn btn-primary" disabled={state === "busy"}>{state === "busy" ? "Sending…" : "Send reset link"}</button>
      <Link href="/login" className="text-center text-sm text-stone underline underline-offset-4">Back to log in</Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");
  if (state === "done") {
    return <div className="rounded-2xl bg-emerald-50 p-6 text-emerald-900"><CheckCircle2 className="mb-2" /><p>Your password has been changed.</p><Link href="/login" className="btn btn-primary mt-4">Log in</Link></div>;
  }
  return (
    <form className="grid gap-4" onSubmit={async (e) => {
      e.preventDefault(); setError("");
      const f = new FormData(e.currentTarget);
      if (f.get("password") !== f.get("confirm")) return setError("The two passwords don't match.");
      setState("busy");
      const r = await post("/api/auth/reset", { token, password: f.get("password") });
      if (r.ok) setState("done"); else { setError(r.error); setState("idle"); }
    }}>
      <div><label className="label" htmlFor="np">New password</label><input id="np" name="password" type="password" minLength={8} className="field" autoComplete="new-password" required /></div>
      <div><label className="label" htmlFor="cp">Confirm new password</label><input id="cp" name="confirm" type="password" minLength={8} className="field" autoComplete="new-password" required /></div>
      <Alert error={error} />
      <button className="btn btn-primary" disabled={state === "busy"}>{state === "busy" ? "Saving…" : "Change password"}</button>
    </form>
  );
}

export function ChangePasswordForm() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");
  return (
    <form className="grid max-w-md gap-4" onSubmit={async (e) => {
      e.preventDefault(); setError(""); setState("busy");
      const form = e.currentTarget;
      const f = new FormData(form);
      if (f.get("password") !== f.get("confirm")) { setState("idle"); return setError("The two passwords don't match."); }
      const r = await post("/api/auth/change-password", { current: f.get("current"), password: f.get("password") });
      if (r.ok) { setState("done"); form.reset(); router.refresh(); } else { setError(r.error); setState("idle"); }
    }}>
      <div><label className="label" htmlFor="cur">Current password</label><input id="cur" name="current" type="password" className="field" autoComplete="current-password" required /></div>
      <div><label className="label" htmlFor="new">New password</label><input id="new" name="password" type="password" minLength={8} className="field" autoComplete="new-password" required /></div>
      <div><label className="label" htmlFor="conf">Confirm new password</label><input id="conf" name="confirm" type="password" minLength={8} className="field" autoComplete="new-password" required /></div>
      <Alert error={error} />
      {state === "done" && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Password changed. Other devices have been signed out.</p>}
      <button className="btn btn-primary self-start" disabled={state === "busy"}>{state === "busy" ? "Saving…" : "Change password"}</button>
    </form>
  );
}
