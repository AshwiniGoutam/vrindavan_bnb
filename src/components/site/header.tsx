"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { cn, whatsappLink } from "@/lib/utils";

const NAV = [
  { href: "/stays", label: "Stays" },
  { href: "/stay-food", label: "Stay + Food" },
  { href: "/darshan-tours", label: "Darshan Tours" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/** Transparent over the homepage hero, ivory once scrolled. */
export function Header({ phone, whatsapp }: { phone?: string; whatsapp?: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // Pages that open with a full-bleed banner: header starts transparent over it.
  const overHero = pathname === "/" || pathname === "/stays" || pathname?.startsWith("/darshan-tours/");
  const solid = scrolled || !overHero || open;
  // The homepage slider announces each slide's text tone; dark text = light photo.
  const [heroTone, setHeroTone] = useState<"dark" | "light">("light");
  const darkText = solid || heroTone === "dark";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const onTone = (e: Event) => setHeroTone((e as CustomEvent<"dark" | "light">).detail === "dark" ? "dark" : "light");
    window.addEventListener("vhi:hero-tone", onTone);
    return () => window.removeEventListener("vhi:hero-tone", onTone);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-colors duration-500", solid ? "border-b hairline bg-ivory/10 backdrop-blur" : "bg-transparent")}>
      <div className="container-x flex h-20 items-center justify-between">
        <Link href="/" aria-label="VHI Luxury Homestays — home" className="relative block h-11 w-[74px]">
          <img src="/brand/vhi-logo-dark.png" alt="VHI Luxury Homestays" className={cn("absolute inset-0 h-full w-auto transition-opacity duration-500", darkText ? "opacity-100" : "opacity-0")} />
          <img src="/brand/vhi-logo-light.png" alt="" aria-hidden className={cn("absolute inset-0 h-full w-auto transition-opacity duration-500", darkText ? "opacity-0" : "opacity-100")} />
        </Link>

        <nav className="hidden items-center gap-9 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn("link-line text-[0.8rem] font-medium tracking-wide", darkText ? "text-charcoal" : "text-ivory", pathname?.startsWith(n.href) && "bg-[length:100%_1px]")}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {phone ? (
            <a href={`tel:${phone.replace(/\s/g, "")}`} className={cn("hidden items-center gap-2 text-[0.8rem] md:flex", darkText ? "text-charcoal" : "text-ivory")}>
              <Phone className="h-4 w-4" strokeWidth={1.4} /> {phone}
            </a>
          ) : null}
          <Link href="/stays" className={cn("btn hidden !px-5 !py-3 sm:inline-flex", darkText ? "btn-primary" : "btn-light")}>
            Book a stay
          </Link>
          <button type="button" onClick={() => setOpen((v) => !v)} className={cn("p-2 lg:hidden", darkText ? "text-charcoal" : "text-ivory")} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"}>
            {open ? <X className="h-6 w-6" strokeWidth={1.3} /> : <Menu className="h-6 w-6" strokeWidth={1.3} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-x-0 bottom-0 top-20 z-40 flex flex-col justify-between bg-ivory px-6 pb-10 pt-8 lg:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {NAV.map((n, i) => (
              <Link key={n.href} href={n.href} className="display border-b hairline py-5 text-4xl text-ink" style={{ animation: `fadeUp .6s ${i * 60}ms both` }}>
                {n.label}
              </Link>
            ))}
            <Link href="/faq" className="display border-b hairline py-5 text-4xl text-ink">
              FAQ
            </Link>
          </nav>
          <div className="grid grid-cols-2 gap-3">
            {phone ? (
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="btn btn-outline">
                Call
              </a>
            ) : null}
            {whatsapp ? (
              <a href={whatsappLink(whatsapp, "Radhe Radhe! I'd like to know more about staying with VHI.")} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            ) : null}
          </div>
          <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
        </div>
      ) : null}
    </header>
  );
}