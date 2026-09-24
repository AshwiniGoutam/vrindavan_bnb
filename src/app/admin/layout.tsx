import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CalendarCheck, CalendarDays, ExternalLink, FileText, Inbox, LayoutDashboard, Link2, Settings, Star, Tag, Users, Image, HelpCircle, Instagram, Newspaper, MessageSquareQuote } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import NavLink from "@/components/admin/NavLink";
import LogoutButton from "@/components/site/LogoutButton";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin(); // every admin page and action re-checks this
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] md:grid-cols-[250px_1fr]">
      <aside className="bg-pine p-4 text-white md:sticky md:top-16 md:h-[calc(100dvh-4rem)] md:overflow-y-auto">
        <p className="px-3.5 pb-1 pt-2 font-display text-xl">Admin</p>
        <p className="px-3.5 pb-4 text-xs text-white/60">{user.email}</p>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto md:flex-col">
          <NavLink href="/admin" exact><LayoutDashboard size={18} /> Dashboard</NavLink>
          <NavLink href="/admin/calendar"><CalendarDays size={18} /> Calendar</NavLink>
          <NavLink href="/admin/stays"><Building2 size={18} /> Stays</NavLink>
          <NavLink href="/admin/bookings"><CalendarCheck size={18} /> Bookings</NavLink>
          <NavLink href="/admin/enquiries"><Inbox size={18} /> Enquiries</NavLink>
          <NavLink href="/admin/channels"><Link2 size={18} /> Channels</NavLink>
          <NavLink href="/admin/reviews"><Star size={18} /> Reviews</NavLink>
          <NavLink href="/admin/coupons"><Tag size={18} /> Coupons</NavLink>
          <NavLink href="/admin/users"><Users size={18} /> Users</NavLink>
          <NavLink href="/admin/content"><FileText size={18} /> Content</NavLink>
          <NavLink href="/admin/banners"><Image size={18} /> Banners</NavLink>
          <NavLink href="/admin/faqs"><HelpCircle size={18} /> FAQs</NavLink>
          <NavLink href="/admin/instagram"><Instagram size={18} /> Instagram</NavLink>
          <NavLink href="/admin/blogs"><Newspaper size={18} /> Blog</NavLink>
          <NavLink href="/admin/testimonials"><MessageSquareQuote size={18} /> Testimonials</NavLink>
          <NavLink href="/admin/settings"><Settings size={18} /> Settings</NavLink>
        </nav>
        <div className="mt-6 hidden border-t border-white/10 pt-4 md:block">
          <Link href="/" className="flex items-center gap-2 px-3.5 py-2 text-sm text-white/75 hover:text-white"><ExternalLink size={16} /> View website</Link>
          <LogoutButton className="px-3.5 py-2 text-sm text-white/75 hover:text-white" />
        </div>
      </aside>
      <div className="min-w-0 bg-mist/60 p-5 md:p-8">{children}</div>
    </div>
  );
}
