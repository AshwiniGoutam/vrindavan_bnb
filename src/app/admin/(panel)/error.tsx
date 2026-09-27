"use client";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-xl border hairline bg-paper p-8">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="display mt-3 text-3xl text-ink">This admin page couldn&apos;t load.</h1>
      <p className="mt-3 text-sm text-muted">{error.message || "Please try again."}</p>
      <button onClick={reset} className="btn btn-primary mt-6 !py-3">Try again</button>
      {error.digest ? <p className="mt-4 font-mono text-xs text-taupe">Ref: {error.digest}</p> : null}
    </div>
  );
}
