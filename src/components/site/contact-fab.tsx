import { MessageCircle, Phone } from "lucide-react";
import { whatsappLink } from "@/lib/utils";

/** Always-reachable WhatsApp + call (bottom-right; stacked above mobile booking bars). */
export function ContactFab({ phone, whatsapp }: { phone?: string; whatsapp?: string }) {
  if (!phone && !whatsapp) return null;
  return (
    <div className="no-print fixed bottom-24 right-4 z-40 flex flex-col gap-3 md:bottom-8 md:right-8">
      {phone ? (
        <a href={`tel:${phone.replace(/\s/g, "")}`} aria-label="Call VHI" className="flex h-12 w-12 items-center justify-center rounded-full border hairline bg-ivory text-charcoal shadow-[0_8px_30px_rgba(14,13,12,0.12)] transition hover:bg-paper">
          <Phone className="h-5 w-5" strokeWidth={1.4} />
        </a>
      ) : null}
      {whatsapp ? (
        <a
          href={whatsappLink(whatsapp, "Radhe Radhe! I'd like to know more about staying with VHI.")}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp VHI"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-charcoal text-ivory shadow-[0_8px_30px_rgba(14,13,12,0.25)] transition hover:bg-ink"
        >
          <MessageCircle className="h-5 w-5" strokeWidth={1.4} />
        </a>
      ) : null}
    </div>
  );
}
