import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/PasswordForms";

export const metadata: Metadata = { title: "Forgot password" };

export default function Page() {
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-4xl">Reset your password</h1>
      <p className="mt-2 text-stone">Enter your email and we'll send you a link to choose a new one.</p>
      <div className="mt-8"><ForgotPasswordForm /></div>
    </div>
  );
}
