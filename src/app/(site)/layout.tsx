import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { ContactFab } from "@/components/site/contact-fab";
import { getSettings } from "@/server/services/settings.service";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-ivory focus:p-3">
        Skip to content
      </a>
      <Header phone={settings.business.phone} whatsapp={settings.business.whatsapp} />
      <main id="main">{children}</main>
      <Footer settings={settings} />
      <ContactFab phone={settings.business.phone} whatsapp={settings.business.whatsapp} />
    </>
  );
}
