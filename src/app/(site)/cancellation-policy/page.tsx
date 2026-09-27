import type { Metadata } from "next";
import { CmsBody, CmsPage } from "@/components/site/cms-page";
import { listPolicies, getPage } from "@/server/services/catalog.service";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "Cancellation policy", description: "Cancellation and refund terms for VHI stays, Stay + Food packages and Darshan tours.", path: "/cancellation-policy" });

const LABEL = { stay: "Stays", stay_food: "Stay + Sattvik Food", darshan: "Darshan Tours" } as const;

export default async function CancellationPage() {
  const [policies, page] = await Promise.all([listPolicies(), getPage("cancellation-policy")]);
  return (
    <CmsPage crumb="Cancellation policy" title={page?.title ?? "Cancellation policy"} intro={page?.intro ?? "Refunds are calculated from the days remaining before check-in or travel, and returned to your original payment method."} body={page?.body}>
      <div className="mt-6 space-y-14">
        {policies.map((p) => (
          <div key={p._id} className="border-t hairline pt-10">
            <p className="eyebrow">{LABEL[p.vertical]}</p>
            <h2 className="display mt-3 text-3xl text-ink">{p.name}</h2>
            {p.summary ? <p className="mt-3 text-muted">{p.summary}</p> : null}
            {p.rules?.length ? (
              <table className="mt-6 w-full text-left text-sm">
                <thead><tr className="border-b hairline"><th className="py-3 font-medium">When you cancel</th><th className="py-3 font-medium">Refund</th></tr></thead>
                <tbody>
                  {[...p.rules].sort((a, b) => b.daysBeforeMin - a.daysBeforeMin).map((r, i) => (
                    <tr key={i} className="border-b hairline"><td className="py-3">{r.daysBeforeMin > 0 ? `${r.daysBeforeMin} or more days before` : "Less than that / no-show"}</td><td className="py-3">{r.refundPercent}%</td></tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {p.body ? <div className="mt-6"><CmsBody body={p.body} /></div> : null}
          </div>
        ))}
        {!policies.length ? <p className="text-muted">Policies will appear here once configured in Admin → Cancellation Policies.</p> : null}
      </div>
    </CmsPage>
  );
}
