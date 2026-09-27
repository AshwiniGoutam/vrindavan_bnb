import Link from "next/link";

export default function RootNotFound() {
  return (
    <main className="flex min-h-svh items-center bg-ivory">
      <div className="container-x">
        <img src="/brand/vhi-logo-dark.png" alt="VHI" className="h-12 w-auto" />
        <p className="eyebrow mt-16">404</p>
        <h1 className="display mt-6 max-w-3xl text-5xl text-ink md:text-8xl">Page not <span className="accent">found.</span></h1>
        <Link href="/" className="btn btn-primary mt-10">Back to home</Link>
      </div>
    </main>
  );
}
