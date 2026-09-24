import { legal } from "@/lib/config";

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="text-4xl md:text-5xl">{title}</h1>
      <p className="mt-3 text-sm text-stone">Last updated {legal.lastUpdated}</p>
      <div className="legal mt-6">{children}</div>
    </article>
  );
}
