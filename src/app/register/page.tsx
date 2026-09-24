import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/session";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-4xl">Create your account</h1>
      <p className="mt-2 text-stone">It takes a minute, and makes booking and changes simple.</p>
      <div className="mt-8"><AuthForm mode="register" next={next} /></div>
    </div>
  );
}
