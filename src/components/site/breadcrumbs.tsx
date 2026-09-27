import Link from "next/link";
import { JsonLd } from "./json-ld";
import { appUrl } from "@/lib/utils";

export function Breadcrumbs({ items, light }: { items: { label: string; href?: string }[]; light?: boolean }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className={light ? "text-sand" : "text-muted"}>
        <ol className="flex flex-wrap items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.18em]">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-2">
              {it.href ? (
                <Link href={it.href} className="link-line">
                  {it.label}
                </Link>
              ) : (
                <span aria-current="page">{it.label}</span>
              )}
              {i < items.length - 1 ? <span aria-hidden>/</span> : null}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.label, item: it.href ? `${appUrl()}${it.href}` : undefined })),
        }}
      />
    </>
  );
}
