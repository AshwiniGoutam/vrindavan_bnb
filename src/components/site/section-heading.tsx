import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, accent, intro, align = "left", className, light }: { eyebrow?: string; title: string; accent?: string; intro?: string; align?: "left" | "center"; className?: string; light?: boolean }) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? <p className={cn("eyebrow mb-5", light && "text-sand")}>{eyebrow}</p> : null}
      <h2 className={cn("display text-4xl md:text-5xl lg:text-5xl", light ? "text-ivory" : "text-ink")}>
        {title} {accent ? <span className="">{accent}</span> : null}
      </h2>
      {intro ? <p className={cn("mt-6 max-w-2xl text-base leading-relaxed md:text-lg", align === "center" && "mx-auto", light ? "text-sand" : "text-muted")}>{intro}</p> : null}
    </div>
  );
}
