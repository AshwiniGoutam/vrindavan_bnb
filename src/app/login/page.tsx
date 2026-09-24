import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/session";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-4xl">Welcome back</h1>
      <p className="mt-2 text-stone">Log in to book stays and see your trips.</p>
      <div className="mt-8"><AuthForm mode="login" next={next} /></div>
    </div>
  );
}
