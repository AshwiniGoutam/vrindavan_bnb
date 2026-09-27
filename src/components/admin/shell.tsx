"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, CalendarCheck, Home, Mountain, UtensilsCrossed, Soup, Tags, Percent, Ticket, Sparkles, Plus, Quote, MessageSquare, Image as ImageIcon,
  Images, Route, Bell, BarChart3, Settings, Users, Menu, X, LogOut, CalendarX, CalendarRange, ScrollText, FileText, Inbox, UserRound, Landmark, Film, ShieldCheck, ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, CalendarCheck, Home, Mountain, UtensilsCrossed, Soup, Tags, Percent, Ticket, Sparkles, Plus, Quote, MessageSquare, ImageIcon, Images, Route, Bell, BarChart3,
  Settings, Users, CalendarX, CalendarRange, ScrollText, FileText, Inbox, UserRound, Landmark, Film, ShieldCheck,
};

export function AdminShell({ nav, user, children }: { nav: NavGroup[]; user: { name: string; role: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href));

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 py-6">
        <Link href="/admin"><img src="/brand/vhi-logo-light.png" alt="VHI" className="h-10 w-auto" /></Link>
        <button className="text-sand lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
      </div>
      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 pb-6">
        {nav.map((g) => (
          <div key={g.label} className="mt-5">
            <p className="px-3 pb-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-taupe">{g.label}</p>
            {g.items.map((it) => {
              const I = ICONS[it.icon] ?? FileText;
              return (
                <Link key={it.href} href={it.href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 px-3 py-2 text-[0.84rem] transition-colors", isActive(it.href) ? "bg-white/10 text-ivory" : "text-sand/80 hover:text-ivory")}>
                  <I className="h-4 w-4" strokeWidth={1.4} />
                  {it.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-6 py-5 text-sm text-sand">
        <p className="text-ivory">{user.name}</p>
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-taupe">{user.role}</p>
        <div className="mt-4 flex gap-4 text-xs">
          <a href="/" target="_blank" className="flex items-center gap-1.5 hover:text-ivory"><ExternalLink className="h-3.5 w-3.5" /> Site</a>
          <button onClick={logout} className="flex items-center gap-1.5 hover:text-ivory"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-svh lg:pl-64 print:pl-0">
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 bg-ink lg:block">{sidebar}</aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-ink">{sidebar}</aside>
        </div>
      ) : null}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center border-b hairline bg-ivory/95 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
        <img src="/brand/vhi-logo-dark.png" alt="VHI" className="ml-4 h-7 w-auto" />
      </header>
      <div className="px-4 py-8 md:px-10 md:py-10">{children}</div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, actions, description }: { eyebrow?: string; title: string; actions?: React.ReactNode; description?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b hairline pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="display mt-2 text-4xl text-ink md:text-5xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Badge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted">—</span>;
  const tone =
    ["published", "active", "confirmed", "paid", "sent", "captured", "processed", "checked_in", "checked_out", "converted", "synced"].includes(value)
      ? "bg-[#e3e6da] text-success"
      : ["failed", "cancelled", "expired", "inactive", "refunded", "closed"].includes(value)
        ? "bg-[#f0dfd9] text-danger"
        : ["maintenance", "pending_payment", "pending", "queued", "draft", "new", "unpublished", "partially_refunded"].includes(value)
          ? "bg-linen text-umber"
          : "bg-paper text-muted";
  return <span className={cn("inline-block px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.12em]", tone)}>{value.replace(/_/g, " ")}</span>;
}
