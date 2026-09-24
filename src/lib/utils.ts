export const cn = (...inputs: (string | false | null | undefined)[]) => inputs.filter(Boolean).join(" ");

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const pad = (n: number) => String(n).padStart(2, "0");

/** Local Date -> "YYYY-MM-DD" (browser use, matches what the calendar shows). */
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** "YYYY-MM-DD" -> local Date at midnight (browser use). */
export const fromISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
/** UTC helpers (server use, matches Postgres DATE columns). */
export const utcISO = (d: Date) => d.toISOString().slice(0, 10);
export const parseUTC = (s: string) => new Date(`${s}T00:00:00.000Z`);
export const addDaysISO = (s: string, n: number) => utcISO(new Date(parseUTC(s).getTime() + n * 864e5));
export const nightsBetween = (a: string, b: string) => Math.round((parseUTC(b).getTime() - parseUTC(a).getTime()) / 864e5);
/** Today's date in India (IST), as YYYY-MM-DD. */
export const todayIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(parseUTC(iso));

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");

export const isISODate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Only allow same-site relative redirects. */
export const safeNext = (n?: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");

/** Inclusive list of ISO dates from `from` to `to`. Capped at 800 days as a safety net. */
export const eachDay = (from: string, to: string) => {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 800; d = addDaysISO(d, 1)) out.push(d);
  return out;
};
export const isMonth = (s: unknown): s is string => typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
export const monthRange = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return { first: `${ym}-01`, last: utcISO(new Date(Date.UTC(y, m, 0))) };
};
export const shiftMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
export const weekdayUTC = (iso: string) => parseUTC(iso).getUTCDay();
export const monthLabel = (ym: string) =>
  new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(parseUTC(`${ym}-01`));
