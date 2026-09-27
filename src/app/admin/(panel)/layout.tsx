import { requireAdmin } from "@/server/auth/session";
import { can, type Permission } from "@/server/auth/permissions";
import { RESOURCES } from "@/admin/resources";
import { AdminShell, type NavGroup } from "@/components/admin/shell";

const RESOURCE_ICONS: Record<string, string> = {
  properties: "Home", tours: "Mountain", packages: "UtensilsCrossed", itineraries: "Route", amenities: "Sparkles", "add-ons": "Plus",
  "meal-plans": "Soup", "price-rules": "Tags", blocks: "CalendarX", departures: "CalendarRange", offers: "Percent", coupons: "Ticket", policies: "ScrollText",
  banners: "ImageIcon", experiences: "Landmark", testimonials: "Quote", faqs: "MessageSquare", reels: "Film", pages: "FileText", enquiries: "Inbox", customers: "UserRound", users: "Users",
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const allowed = (p: Permission) => can(admin.role, p);
  const byGroup = (g: string) => RESOURCES.filter((r) => r.group === g && allowed(r.permission)).map((r) => ({ href: `/admin/${r.key}`, label: r.label, icon: RESOURCE_ICONS[r.key] ?? "FileText" }));

  const nav: NavGroup[] = [
    {
      label: "Overview",
      items: [
        { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
        ...(allowed("bookings.view") ? [{ href: "/admin/bookings", label: "Bookings", icon: "CalendarCheck" }] : []),
        ...(allowed("analytics.view") ? [{ href: "/admin/analytics", label: "Analytics", icon: "BarChart3" }] : []),
      ],
    },
    { label: "Catalogue", items: byGroup("Catalogue") },
    { label: "Pricing & offers", items: byGroup("Pricing & offers") },
    { label: "Content", items: [...byGroup("Content"), ...(allowed("media.manage") ? [{ href: "/admin/media", label: "Media Library", icon: "Images" }] : [])] },
    {
      label: "Operations",
      items: [...byGroup("Operations"), ...(allowed("notifications.view") ? [{ href: "/admin/notifications", label: "Notifications", icon: "Bell" }] : [])],
    },
    {
      label: "Admin",
      items: [
        ...byGroup("Admin"),
        ...(allowed("settings.manage") ? [{ href: "/admin/settings", label: "Settings", icon: "Settings" }] : []),
        ...(allowed("audit.view") ? [{ href: "/admin/audit", label: "Audit log", icon: "ShieldCheck" }] : []),
      ],
    },
  ].filter((g) => g.items.length);

  return (
    <AdminShell nav={nav} user={{ name: admin.name, role: admin.role }}>
      {children}
    </AdminShell>
  );
}
