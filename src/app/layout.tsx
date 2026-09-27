import type { Metadata, Viewport } from "next";
import { DM_Mono, Instrument_Serif, Manrope } from "next/font/google";
import { Analytics } from "@/components/analytics/analytics";
import { appUrl } from "@/lib/utils";
import "@/styles/globals.css";

const display = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument-serif", display: "swap" });
const sans = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "VHI · Luxury Homestays in Vrindavan", template: "%s · VHI Vrindavan" },
  description: "Private luxury homestays, sattvik food and guided Darshan journeys in Vrindavan — by VHI, Vrindavan Holiday Inn.",
  applicationName: "VHI Luxury Homestays",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#f2efe8", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
