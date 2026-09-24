import type { Metadata, Viewport } from "next";
import { Young_Serif, Figtree } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/config";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import WhatsAppButton from "@/components/site/WhatsAppButton";

const display = Young_Serif({ weight: "400", subsets: ["latin"], variable: "--font-young-serif", display: "swap" });
const sans = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name}: ${site.tagline}`, template: `%s | ${site.name}` },
  description: "Handpicked private villas and homestays across India with a caretaker, a home-cooked meal and your own space. Book direct and pay securely.",
  openGraph: { type: "website", siteName: site.name, locale: "en_IN" },
};

export const viewport: Viewport = { themeColor: "#12352f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
