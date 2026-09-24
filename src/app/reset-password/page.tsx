import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/PasswordForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-4xl">Choose a new password</h1>
      {token ? <div className="mt-8"><ResetPasswordForm token={token} /></div> : (
        <p className="mt-4 text-stone">This link is incomplete. <Link href="/forgot-password" className="underline">Request a new one</Link>.</p>
      )}
    </div>
  );
}
