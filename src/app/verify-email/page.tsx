import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

export const metadata: Metadata = { title: "Email confirmation", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ok = (await searchParams).status === "ok";
  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      {ok ? <CheckCircle2 className="mx-auto text-emerald-700" size={40} /> : <XCircle className="mx-auto text-red-700" size={40} />}
      <h1 className="mt-4 text-3xl">{ok ? "Email confirmed" : "This link didn't work"}</h1>
      <p className="mt-2 text-stone">{ok ? "Thanks. Your email is verified." : "It may have expired or already been used. Log in and choose Resend from My trips."}</p>
      <Link href={ok ? "/stays" : "/account"} className="btn btn-primary mt-6">{ok ? "Find a stay" : "Go to My trips"}</Link>
    </div>
  );
}
