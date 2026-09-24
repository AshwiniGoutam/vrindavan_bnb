"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const on = exact ? path === href : path.startsWith(href);
  return (
    <Link href={href} aria-current={on ? "page" : undefined}
      className={cn("flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.95rem] font-medium transition-colors", on ? "bg-white text-pine" : "text-white/75 hover:bg-white/10 hover:text-white")}>
      {children}
    </Link>
  );
}
