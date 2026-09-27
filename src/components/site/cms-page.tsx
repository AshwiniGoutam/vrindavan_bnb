import { Breadcrumbs } from "./breadcrumbs";
import { Photo } from "./photo";
import type { MediaRef } from "@/lib/media";

/** Renders admin-authored plain text safely: blank line = paragraph, "## " = heading, "- " = bullet. */
export function CmsBody({ body }: { body?: string }) {
  const blocks = (body ?? "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="prose-vhi text-lg text-charcoal/90">
      {blocks.map((b, i) => {
        if (b.startsWith("## ")) return <h2 key={i}>{b.slice(3)}</h2>;
        const lines = b.split("\n");
        if (lines.every((l) => l.trim().startsWith("- ")))
          return (
            <ul key={i} className="mb-5 list-disc space-y-2 pl-6">
              {lines.map((l, j) => <li key={j}>{l.trim().slice(2)}</li>)}
            </ul>
          );
        return <p key={i}>{b}</p>;
      })}
    </div>
  );
}

export function CmsPage({ title, intro, body, heroImage, crumb, children }: { title: string; intro?: string; body?: string; heroImage?: MediaRef; crumb: string; children?: React.ReactNode }) {
  return (
    <>
      <section className="pb-14 pt-36 md:pt-44">
        <div className="container-x max-w-4xl">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: crumb }]} />
          <h1 className="display mt-8 text-5xl text-ink md:text-7xl">{title}</h1>
          {intro ? <p className="mt-6 text-xl leading-relaxed text-muted">{intro}</p> : null}
        </div>
      </section>
      {heroImage?.url ? <div className="container-x"><Photo media={heroImage} alt={title} className="aspect-[21/9]" /></div> : null}
      <section className="container-x max-w-4xl py-16">
        <CmsBody body={body} />
        {children}
      </section>
    </>
  );
}
