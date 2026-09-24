import Link from "next/link";
import { Menu } from "lucide-react";
import Logo from "./Logo";
import LogoutButton from "./LogoutButton";
import { getCurrentUser } from "@/lib/session";

const nav = [
  { href: "/stays", label: "All stays" },
  { href: "/stays?collection=private-pool", label: "Private pools" },
  { href: "/stays?collection=heritage", label: "Heritage" },
  { href: "/blog", label: "Journal" },
  { href: "/about", label: "About" },
  { href: "/contact?topic=list-property", label: "List your property" },
];

export default async function Header() {
  const user = await getCurrentUser();
  return (
    <>
    {/* <div className="bg-pine px-4 py-2 text-center text-xs font-semibold tracking-wide text-white">DEMO MODE · Sample data only · No database connected</div> */}
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-7 text-[0.95rem] font-medium md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-stone transition-colors hover:text-pine">{n.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              {user.role === "ADMIN" && <Link href="/admin" className="btn btn-ghost !py-2">Admin</Link>}
              <Link href="/account" className="btn btn-ghost !py-2">My trips</Link>
              <LogoutButton className="px-3 text-sm font-medium text-stone hover:text-pine" />
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login" className="px-3 text-sm font-medium text-stone hover:text-pine">Log in</Link>
              <Link href="/register" className="btn btn-primary !py-2">Sign up</Link>
            </div>
          )}
          <details className="relative md:hidden">
            <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-line" aria-label="Open menu">
              <Menu size={20} />
            </summary>
            <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-line bg-white p-2 shadow-xl">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="block rounded-xl px-4 py-3 hover:bg-mist">{n.label}</Link>
              ))}
              <hr className="my-2 border-line" />
              {user ? (
                <>
                  {user.role === "ADMIN" && <Link href="/admin" className="block rounded-xl px-4 py-3 hover:bg-mist">Admin</Link>}
                  <Link href="/account" className="block rounded-xl px-4 py-3 hover:bg-mist">My trips</Link>
                  <LogoutButton className="block w-full rounded-xl px-4 py-3 text-left hover:bg-mist" />
                </>
              ) : (
                <>
                  <Link href="/login" className="block rounded-xl px-4 py-3 hover:bg-mist">Log in</Link>
                  <Link href="/register" className="block rounded-xl px-4 py-3 font-semibold hover:bg-mist">Sign up</Link>
                </>
              )}
            </div>
          </details>
        </div>
      </div>
    </header>
    </>
  );
}
