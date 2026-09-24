import type { Metadata } from "next";
import { MessageCircle, Phone } from "lucide-react";
import EnquiryForm from "@/components/EnquiryForm";
import { site, waLink } from "@/lib/config";

export const metadata: Metadata = { title: "Contact" };

export default async function Contact({ searchParams }: { searchParams: Promise<{ topic?: string; stay?: string }> }) {
  const sp = await searchParams;
  const listing = sp.topic === "list-property";
  return (
    <div className="mx-auto grid max-w-6xl gap-14 px-5 py-14 md:grid-cols-[1fr_1.1fr]">
      <div>
        <h1 className="text-4xl md:text-5xl">{listing ? "Let's list your property" : "Tell us what you need"}</h1>
        <p className="mt-4 max-w-md text-stone">
          {listing ? "Share a few details about your villa and we'll come back with a plan, pricing and next steps."
            : "Planning a group trip, a celebration or just can't decide? Send a note and a real person will reply."}
        </p>
        <div className="mt-8 grid gap-3">
          <a className="btn btn-primary" target="_blank" rel="noreferrer" href={waLink("Hi, I have a question.")}><MessageCircle size={18} /> Chat on WhatsApp</a>
          <a className="btn btn-ghost" href={`tel:${site.phoneDisplay.replace(/\s/g, "")}`}><Phone size={18} /> {site.phoneDisplay}</a>
        </div>
      </div>
      <div className="rounded-3xl border border-line bg-white p-6 md:p-8">
        <EnquiryForm defaultTopic={sp.topic ?? "stay"} />
      </div>
    </div>
  );
}
