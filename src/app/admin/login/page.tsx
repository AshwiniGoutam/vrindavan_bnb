import { redirect } from "next/navigation";
import { getAdmin } from "@/server/auth/session";
import { isDbConfigured } from "@/server/db/connect";
import { LoginForm } from "@/components/admin/login-form";

export default async function LoginPage() {
  if (isDbConfigured() && (await getAdmin().catch(() => null))) redirect("/admin");
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink p-12 text-ivory lg:flex">
        <img src="/brand/vhi-logo-light.png" alt="VHI" className="h-14 w-auto self-start" />
        <p className="display max-w-md text-5xl">Every stay, tour and rupee — <span className="accent text-sand">in one quiet place.</span></p>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-taupe">VHI · Admin</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <img src="/brand/vhi-logo-dark.png" alt="VHI" className="mb-12 h-12 w-auto lg:hidden" />
          <p className="eyebrow">Admin</p>
          <h1 className="display mt-3 text-4xl text-ink">Sign in</h1>
          {!isDbConfigured() ? <p className="mt-6 bg-linen p-4 text-sm text-danger">MONGODB_URI is not configured. See README → MongoDB setup.</p> : null}
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
