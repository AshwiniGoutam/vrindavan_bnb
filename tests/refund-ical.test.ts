import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRefund, refundPercentFor } from "../src/lib/refund";
import { buildCalendar, parseIcs } from "../src/lib/ical-format";

const tiers = [{ daysBefore: 7, refundPercent: 100 }, { daysBefore: 3, refundPercent: 50 }, { daysBefore: 0, refundPercent: 0 }];

test("refund tiers", () => {
  assert.equal(refundPercentFor(tiers, 30), 100);
  assert.equal(refundPercentFor(tiers, 7), 100);
  assert.equal(refundPercentFor(tiers, 6), 50);
  assert.equal(refundPercentFor(tiers, 3), 50);
  assert.equal(refundPercentFor(tiers, 2), 0);
  assert.equal(refundPercentFor(tiers, -1), 0);
  assert.equal(refundPercentFor([], 10), 0);
});

test("refund amount is a rounded-down share of what was paid", () => {
  const r = computeRefund(tiers, "2026-10-10", "2026-10-06", 12345); // 4 days out => 50%
  assert.deepEqual(r, { daysUntil: 4, percent: 50, amount: 6172 });
});

test("ical export then parse round-trips", () => {
  const ics = buildCalendar("Casa, Palma", [{ uid: "a@k", start: "2026-10-01", end: "2026-10-04", summary: "Reserved" }]);
  assert.match(ics, /DTSTART;VALUE=DATE:20261001/);
  assert.match(ics, /X-WR-CALNAME:Casa\\, Palma/);
  assert.deepEqual(parseIcs(ics), [{ start: "2026-10-01", end: "2026-10-04", summary: "Reserved" }]);
});

test("ical parse: cancelled events skipped, datetimes and folded lines handled, bad end fixed", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT", "DTSTART:20261010T140000Z", "DTEND:20261012T110000Z", "SUMMARY:Airbnb (Not available)", "END:VEVENT",
    "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20261020", "DTEND;VALUE=DATE:20261020", "SUMMARY:Reser", " ved", "END:VEVENT",
    "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20261101", "DTEND;VALUE=DATE:20261103", "STATUS:CANCELLED", "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  assert.deepEqual(parseIcs(ics), [
    { start: "2026-10-10", end: "2026-10-12", summary: "Airbnb (Not available)" },
    { start: "2026-10-20", end: "2026-10-21", summary: "Reserved" },
  ]);
});
