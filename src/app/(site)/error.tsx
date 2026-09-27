"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="flex min-h-[70svh] items-center pt-24">
      <div className="container-x">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="display mt-6 max-w-3xl text-5xl text-ink md:text-7xl">We couldn&apos;t load this page.</h1>
        <p className="mt-6 max-w-lg text-muted">Please try again. If you were paying, don&apos;t worry — your payment is safe and your booking status is on its way to you.</p>
        <div className="mt-10 flex gap-3">
          <button onClick={reset} className="btn btn-primary">Try again</button>
          <Link href="/" className="btn btn-outline">Home</Link>
        </div>
        {error.digest ? <p className="mt-8 font-mono text-xs text-taupe">Ref: {error.digest}</p> : null}
      </div>
    </section>
  );
}
