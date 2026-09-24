import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/config";

export default function WhatsAppButton() {
  return (
    <a
      href={waLink("Hi, I need help booking a stay.")}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
    >
      <MessageCircle size={26} />
    </a>
  );
}
