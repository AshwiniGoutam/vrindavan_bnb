import { addDaysISO } from "./utils";

const ymd = (s: string) => s.replace(/-/g, "");
const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

export function buildCalendar(name: string, events: { uid: string; start: string; end: string; summary: string }[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vrindavan Holiday Inn//Bookings//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${esc(name)}`,
    ...events.flatMap((e) => [
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(e.start)}`,
      `DTEND;VALUE=DATE:${ymd(e.end)}`,
      `SUMMARY:${esc(e.summary)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

const toISODate = (raw: string) => `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;

export function parseIcs(text: string) {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const events: { start: string; end: string; summary: string }[] = [];
  for (const block of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0];
    const get = (key: string) => body.match(new RegExp(`^${key}[^:\\r\\n]*:(.*)$`, "m"))?.[1]?.trim();
    if (get("STATUS")?.toUpperCase() === "CANCELLED") continue;
    const s = get("DTSTART");
    if (!s || !/^\d{8}/.test(s)) continue;
    const e = get("DTEND");
    const start = toISODate(s);
    let end = e && /^\d{8}/.test(e) ? toISODate(e) : addDaysISO(start, 1);
    if (end <= start) end = addDaysISO(start, 1);
    events.push({ start, end, summary: get("SUMMARY") ?? "Reserved" });
  }
  return events;
}
