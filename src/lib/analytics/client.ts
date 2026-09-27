"use client";

/** Browser-side analytics: GA4 + Meta Pixel + first-party funnel (/api/track). */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"] as const;
const ATTR_KEY = "vhi_attr";
const SID_KEY = "vhi_sid";

export function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SID_KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "");
      sessionStorage.setItem(SID_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

/** First-touch attribution for 30 days (so a Meta ad click is credited even if they book later). */
export function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const found = Object.fromEntries(UTM_KEYS.map((k) => [k, params.get(k)]).filter(([, v]) => v));
    const existing = localStorage.getItem(ATTR_KEY);
    if (Object.keys(found).length && !existing) {
      localStorage.setItem(ATTR_KEY, JSON.stringify({ ...found, landingPage: window.location.pathname, referrer: document.referrer || undefined, at: Date.now() }));
    }
  } catch {
    /* storage unavailable */
  }
}

export function getAttribution(): Record<string, string> | undefined {
  try {
    const raw = localStorage.getItem(ATTR_KEY);
    if (!raw) return undefined;
    const data = JSON.parse(raw) as Record<string, string | number>;
    if (Date.now() - Number(data.at ?? 0) > 30 * 86_400_000) return undefined;
    const { at: _at, ...rest } = data;
    void _at;
    return Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, String(v)]));
  } catch {
    return undefined;
  }
}

const device = () => (window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop");

function firstParty(type: string, extra: Record<string, unknown> = {}) {
  const attr = getAttribution();
  const body = JSON.stringify({ type, sessionId: sessionId(), path: window.location.pathname, device: device(), utm_source: attr?.utm_source, utm_campaign: attr?.utm_campaign, ...extra });
  if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
  else fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => undefined);
}

export function trackPageView() {
  window.gtag?.("event", "page_view", { page_path: window.location.pathname });
  window.fbq?.("track", "PageView");
  firstParty("page_view");
}

export function trackViewItem(item: { id: string; name: string; vertical: string; price?: number }) {
  window.gtag?.("event", "view_item", { currency: "INR", value: (item.price ?? 0) / 100, items: [{ item_id: item.id, item_name: item.name, item_category: item.vertical }] });
  window.fbq?.("track", "ViewContent", { content_ids: [item.id], content_name: item.name, content_type: "product", currency: "INR", value: (item.price ?? 0) / 100 });
  firstParty("view_item", { vertical: item.vertical, itemId: item.id });
}

export function trackBeginCheckout(item: { id: string; name: string; vertical: string; value: number }) {
  window.gtag?.("event", "begin_checkout", { currency: "INR", value: item.value / 100, items: [{ item_id: item.id, item_name: item.name, item_category: item.vertical }] });
  window.fbq?.("track", "InitiateCheckout", { content_ids: [item.id], currency: "INR", value: item.value / 100 });
}

/** eventId = booking code, so the Pixel and the Conversions API event deduplicate. */
export function trackPurchase(p: { code: string; value: number; name: string; vertical: string }) {
  window.gtag?.("event", "purchase", { transaction_id: p.code, currency: "INR", value: p.value / 100, items: [{ item_name: p.name, item_category: p.vertical }] });
  window.fbq?.("track", "Purchase", { currency: "INR", value: p.value / 100, content_name: p.name }, { eventID: p.code });
}

export function trackLead(name: string) {
  window.gtag?.("event", "generate_lead", { item_name: name });
  window.fbq?.("track", "Lead", { content_name: name });
}
