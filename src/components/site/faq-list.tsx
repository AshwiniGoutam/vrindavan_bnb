import { Plus } from "lucide-react";
import { paragraphs } from "@/lib/utils";

export function FaqList({ items }: { items: { question: string; answer: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="divide-y hairline border-y">
      {items.map((f, i) => (
        <details key={i} className="group py-6">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg text-ink md:text-xl [&::-webkit-details-marker]:hidden">
            <span className="display text-2xl leading-snug">{f.question}</span>
            <Plus className="mt-1 h-5 w-5 shrink-0 transition-transform duration-500 group-open:rotate-45" strokeWidth={1.2} />
          </summary>
          <div className="mt-4 max-w-3xl text-muted">
            {paragraphs(f.answer).map((p, j) => (
              <p key={j} className="mb-3 leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
