import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-[80svh] items-center pt-24">
      <div className="container-x">
        <p className="eyebrow">404</p>
        <h1 className="display mt-6 max-w-3xl text-5xl text-ink md:text-8xl">This lane doesn&apos;t lead <span className="accent">anywhere.</span></h1>
        <p className="mt-6 max-w-lg text-lg text-muted">Even in Vrindavan, some galis end in a wall. Let&apos;s get you back.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary">Home</Link>
          <Link href="/stays" className="btn btn-outline">Stays</Link>
          <Link href="/darshan-tours" className="btn btn-outline">Darshan tours</Link>
        </div>
      </div>
    </section>
  );
}
