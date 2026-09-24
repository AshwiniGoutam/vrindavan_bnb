import Link from "next/link";
import { site } from "@/lib/config";

export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={`${site.name} home`}>
      {/* <svg width="22" height="28" viewBox="0 0 22 28" aria-hidden="true">
        <path d="M1 27V11C1 5.5 5.5 1 11 1s10 4.5 10 10v16z" fill="none" stroke={light ? "#fff" : "#12352f"} strokeWidth="2" />
        <circle cx="11" cy="14" r="3" fill="#e9a23b" />
      </svg> */}
      <span className={`font-display text-2xl ${light ? "text-white" : "text-pine"}`}>{site.name}</span>
    </Link>
  );
}
