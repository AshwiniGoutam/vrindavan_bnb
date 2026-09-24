import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMonth, type CalBooking } from "../src/lib/calendar-pure";
import { groupRuns, mapOta, normalizeRevision, rateString } from "../src/lib/channex-format";
import { eachDay, monthRange, shiftMonth } from "../src/lib/utils";

const stay = { basePrice: 10000, weekendPrice: 14000, extraGuestFee: 0, cleaningFee: 0, baseGuests: 4, maxGuests: 8, minNights: 1 };
const bk = (o: Partial<CalBooking>): CalBooking => ({
  id: "b1", code: "KTH-1", guestName: "Asha", source: "DIRECT", status: "CONFIRMED", paymentStatus: "PAID",
  checkIn: "2026-10-05", checkOut: "2026-10-08", total: 30000, guests: 2, ...o,
});

test("date helpers", () => {
  assert.deepEqual(monthRange("2026-02"), { first: "2026-02-01", last: "2026-02-28" });
  assert.equal(monthRange("2028-02").last, "2028-02-29");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.deepEqual(eachDay("2026-10-30", "2026-11-02"), ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
});

test("calendar: booking covers nights but not the check-out day", () => {
  const days = eachDay("2026-10-04", "2026-10-09");
  const cells = buildMonth(days, stay, [bk({})], [], {});
  assert.deepEqual(cells.map((c) => c.kind), ["free", "booking", "booking", "booking", "free", "free"]);
  assert.equal(cells[1].isFirst, true);
  assert.equal(cells[2].isFirst, false);
  assert.equal(cells[1].label, "Asha");
});

test("calendar: cancelled bookings are ignored, channel blocks and manual blocks are labelled", () => {
  const days = eachDay("2026-10-10", "2026-10-13");
  const cells = buildMonth(days, stay,
    [bk({ status: "CANCELLED", checkIn: "2026-10-10", checkOut: "2026-10-12" })],
    [{ id: "x1", start: "2026-10-11", end: "2026-10-12", source: "Airbnb", feedId: "f1", summary: "Reserved" },
     { id: "x2", start: "2026-10-12", end: "2026-10-14", source: "Manual", feedId: null, summary: "Owner stay" }],
    {});
  assert.deepEqual(cells.map((c) => c.kind), ["free", "channel", "blocked", "blocked"]);
  assert.equal(cells[2].label, "Owner stay");
});

test("calendar: double bookings are flagged, overrides shown", () => {
  const days = eachDay("2026-10-05", "2026-10-06");
  const cells = buildMonth(days, stay, [bk({})], [{ id: "x", start: "2026-10-05", end: "2026-10-06", source: "Airbnb", feedId: "f", summary: null }],
    { "2026-10-06": { price: 25000, minNights: 3 } });
  assert.equal(cells[0].conflict, true);
  assert.equal(cells[1].conflict, false);
  assert.equal(cells[1].price, 25000);
  assert.equal(cells[1].overridden, true);
  assert.equal(cells[1].minNights, 3);
});

test("groupRuns merges only consecutive equal dates", () => {
  const runs = groupRuns([
    { date: "2026-10-01", value: 1 }, { date: "2026-10-02", value: 1 }, { date: "2026-10-03", value: 0 },
    { date: "2026-10-04", value: 1 }, { date: "2026-10-06", value: 1 },
  ]);
  assert.deepEqual(runs, [
    { from: "2026-10-01", to: "2026-10-02", value: 1 }, { from: "2026-10-03", to: "2026-10-03", value: 0 },
    { from: "2026-10-04", to: "2026-10-04", value: 1 }, { from: "2026-10-06", to: "2026-10-06", value: 1 },
  ]);
});

test("mapOta and rateString", () => {
  assert.equal(mapOta("Airbnb"), "AIRBNB");
  assert.equal(mapOta("BookingCom"), "BOOKING_COM");
  assert.equal(mapOta("Goibibo"), "MAKEMYTRIP");
  assert.equal(mapOta("A-Expedia"), "OTHER");
  assert.equal(mapOta(undefined), "OTHER");
  assert.equal(rateString(8500), "8500.00");
});

// Payloads copied from Channex's public docs (bookings collection).
test("normalizeRevision: Airbnb new booking", () => {
  const n = normalizeRevision("rev1", {
    status: "new", property_id: "p1", unique_id: "ABB-HM5MBZ1AVA", ota_name: "Airbnb", amount: "249.60", currency: "GBP",
    arrival_date: "2020-09-08", departure_date: "2020-09-11", occupancy: { adults: 1, children: 0, infants: 0 },
    customer: { name: "Name", surname: "Surname", mail: "c@guest.airbnb.com", phone: "123" }, payment_collect: null, notes: "n",
    rooms: [{ checkin_date: "2020-09-08", checkout_date: "2020-09-11", occupancy: { adults: 1 } }],
  })!;
  assert.equal(n.source, "AIRBNB");
  assert.equal(n.total, 250);
  assert.equal(n.guests, 1);
  assert.equal(n.guestName, "Name Surname");
  assert.equal(n.prepaidByOta, false);
  assert.equal(n.checkOut, "2020-09-11");
});

test("normalizeRevision: Goibibo prepaid, cancelled Booking.com, and junk", () => {
  const g = normalizeRevision("r2", { status: "new", property_id: "p", unique_id: "GMT-0123936109", ota_name: "Goibibo", amount: "9100.00", currency: "THB",
    arrival_date: "2025-04-14", departure_date: "2025-04-19", occupancy: { adults: 2, children: 1 }, customer: { name: "A", surname: "B", mail: "", phone: "" }, payment_collect: "ota" })!;
  assert.equal(g.source, "MAKEMYTRIP");
  assert.equal(g.prepaidByOta, true);
  assert.equal(g.guests, 3);
  const c = normalizeRevision("r3", { status: "cancelled", property_id: "p", unique_id: "BDC-3333333333", ota_name: "BookingCom", amount: "76.50",
    arrival_date: "2020-11-13", departure_date: "2020-11-15", occupancy: { adults: 2 }, customer: {} })!;
  assert.equal(c.status, "cancelled");
  assert.equal(c.guestName, "Guest (via channel)");
  assert.equal(normalizeRevision("r4", { status: "weird" }), null);
  assert.equal(normalizeRevision("r5", { status: "new", property_id: "p" }), null);
});
