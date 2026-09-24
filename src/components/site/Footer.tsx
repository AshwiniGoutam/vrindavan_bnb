import Link from "next/link";
import Logo from "./Logo";
import { destinations, legal, site, waLink } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="mt-0 border-t border-white/10 bg-pine text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-sm text-white/70">{site.tagline}. A caretaker, a home-cooked meal and space that's only yours.</p>
          <a href={waLink("Hi, I'd like help planning a stay.")} className="btn btn-marigold mt-6" target="_blank" rel="noreferrer">
            Chat on WhatsApp
          </a>
        </div>
        <div>
          <h2 className="font-display text-lg">Popular destinations</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-white/75">
            {destinations.slice(0, 8).map((d) => (
              <li key={d}><Link className="hover:text-white" href={`/stays?city=${encodeURIComponent(d)}`}>{d}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-lg">Company</h2>
          <ul className="mt-4 space-y-2 text-white/75">
            <li><Link className="hover:text-white" href="/contact?topic=list-property">List your property</Link></li>
            <li><Link className="hover:text-white" href="/contact?topic=group">Group and corporate stays</Link></li>
            <li><Link className="hover:text-white" href="/contact">Contact</Link></li>
            <li>{site.phoneDisplay}</li>
            <li>{site.email}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-sm text-white/55">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} {legal.companyName}. All rights reserved.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-5">
            <Link className="hover:text-white" href="/terms">Terms</Link>
            <Link className="hover:text-white" href="/privacy">Privacy</Link>
            <Link className="hover:text-white" href="/cancellation-policy">Cancellation and refunds</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
