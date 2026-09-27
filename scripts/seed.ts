/**
 * Seed MongoDB with the initial VHI catalogue: npm run seed
 *
 * - Idempotent and non-destructive: only creates what is missing, never overwrites admin edits.
 * - Darshan prices are the client's (₹5,999 / ₹8,999 / ₹11,999 per person).
 * - Property nightly rates and meal prices are NOT known yet: in development they get
 *   SAMPLE values and everything is published so you can click through the site.
 *   Outside development, rates are 0 and content is created as DRAFT for the client to complete.
 * - Contains no real credentials. The first owner account comes from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import mongoose from "mongoose";
import {
  AddOn, Amenity, Banner, CancellationPolicy, DarshanTour, Experience, Faq, Itinerary, MealPlan, Page, Property, Settings, StayPackage, User,
} from "../src/server/models";
import { hashPassword } from "../src/server/auth/password";

const DEV = (process.env.APP_ENV ?? "development") === "development";
const STATUS = DEV ? "published" : "draft";
const rs = (rupees: number) => (DEV ? rupees * 100 : 0); // sample price (paise) in dev only
const publishing = { status: STATUS, ...(DEV ? { publishedAt: new Date() } : {}) };

async function upsert<T extends Record<string, unknown>>(model: mongoose.Model<unknown>, filter: Record<string, unknown>, doc: T) {
  // $setOnInsert: create if missing, NEVER overwrite what the client has edited in admin.
  const res = await model.findOneAndUpdate(filter, { $setOnInsert: doc }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean<{ _id: mongoose.Types.ObjectId }>();
  return res!._id;
}

const AMENITIES: [string, string, string][] = [
  ["Wi-Fi", "Wifi", "Essentials"], ["Air conditioning", "Snowflake", "Essentials"], ["Power backup", "Zap", "Essentials"], ["Hot water", "Droplets", "Essentials"],
  ["Fully equipped kitchen", "CookingPot", "Kitchen"], ["Refrigerator", "Refrigerator", "Kitchen"], ["Microwave", "Microwave", "Kitchen"], ["RO drinking water", "Droplets", "Kitchen"],
  ["Smart TV", "Tv", "Comfort"], ["Washing machine", "WashingMachine", "Comfort"], ["Fresh linen & towels", "BedDouble", "Comfort"], ["Iron", "Shirt", "Comfort"],
  ["Parking", "Car", "Outside"], ["Balcony / terrace", "Sun", "Outside"], ["Housekeeping on request", "Sparkles", "Services"], ["Self check-in", "Key", "Services"],
  ["CCTV at entrance", "ShieldCheck", "Safety"], ["Family friendly", "Baby", "Services"],
];

type P = { name: string; slug: string; type: string; bedrooms: number; bathrooms: number; max: number; rate: number; area: string; tagline: string; label?: string; featured?: boolean };
const PROPERTIES: P[] = [
  { name: "RadhaKrishna Kutir", slug: "radhakrishna-kutir", type: "2bhk", bedrooms: 2, bathrooms: 2, max: 6, rate: 4500, area: "Raman Reti", tagline: "A calm family home near the parikrama path.", featured: true },
  { name: "Nitya Nikunj", slug: "nitya-nikunj", type: "2bhk", bedrooms: 2, bathrooms: 2, max: 6, rate: 4500, area: "Chhatikara Road", tagline: "Light-filled rooms and an easy drive to Prem Mandir.", featured: true },
  { name: "Shyamakunj", slug: "shyamakunj", type: "2bhk", bedrooms: 2, bathrooms: 2, max: 6, rate: 4300, area: "Vrindavan", tagline: "Quiet evenings after busy darshan days." },
  { name: "Leela Niwas", slug: "leela-niwas", type: "2bhk", bedrooms: 2, bathrooms: 2, max: 6, rate: 4800, area: "Vrindavan", tagline: "Our most-loved home for families.", featured: true },
  { name: "Prema Ras Kutir", slug: "prema-ras-kutir", type: "studio", bedrooms: 1, bathrooms: 1, max: 2, rate: 2500, area: "Vrindavan", tagline: "A serene studio for two." },
  { name: "Braj Casa", slug: "braj-casa", type: "studio", bedrooms: 1, bathrooms: 1, max: 2, rate: 2600, area: "Vrindavan", tagline: "Compact, modern and close to everything.", label: "ATT" },
  { name: "Vrinda Villas", slug: "vrinda-villas", type: "studio", bedrooms: 1, bathrooms: 1, max: 3, rate: 2700, area: "Vrindavan", tagline: "A bright studio with a little extra room." },
  { name: "Braj Vaas", slug: "braj-vaas", type: "1bhk", bedrooms: 1, bathrooms: 1, max: 4, rate: 3300, area: "Vrindavan", tagline: "One-bedroom comfort with a separate living room." },
  { name: "Tulsi Niwas", slug: "tulsi-niwas", type: "2bhk", bedrooms: 2, bathrooms: 2, max: 6, rate: 4400, area: "Vrindavan", tagline: "Named for the tulsi that greets you at the door." },
  { name: "Kripa Nikunj", slug: "kripa-nikunj", type: "villa", bedrooms: 4, bathrooms: 4, max: 12, rate: 11000, area: "Vrindavan", tagline: "A four-bedroom villa for families and satsang groups.", featured: true },
];

const TOUR_COMMON = {
  bookingMode: "both",
  minGroupSize: 4,
  advanceDays: 15,
  childrenCountTowardMinimum: true,
  dateMode: "any_date",
  stayAllocation: "manual",
  mealInfo: "Freshly cooked sattvik vegetarian meals — no onion, no garlic. Breakfast and dinner at your VHI home; lunch at a trusted local bhojanalaya on the road.",
  pickupInfo: "Complimentary pickup from Mathura Junction railway station or Mathura/Vrindavan bus stands at your arrival time, and drop at the end of the journey. Pickups from Delhi NCR or Agra can be added.",
  pickupPoints: ["Mathura Junction railway station", "Vrindavan / Mathura bus stand", "Your hotel in Vrindavan", "Delhi NCR (add-on)"],
  vehicleInfo: "A private, air-conditioned vehicle with an experienced local driver for the whole journey — sedan for groups of up to 4, Innova / Ertiga for 5–7, Tempo Traveller for larger groups.",
  exclusions: ["Train or flight tickets to Mathura", "Special / VIP darshan tickets and temple donations", "Personal shopping, laundry and tips", "Anything not listed under inclusions"],
  importantInfo: [
    "Temple timings change with seasons and festivals; your guide adjusts the plan on the day.",
    "Modest clothing is expected in temples. Leather items are not allowed in some temples.",
    "Phones and cameras are not permitted inside Banke Bihari and some other temples.",
    "Carry a government photo ID for every adult.",
    "Festival dates (Holi, Janmashtami, Radhashtami) see very large crowds — book early.",
  ],
  faqs: [
    { question: "Can we book for fewer than 4 people?", answer: "Online bookings need at least 4 guests. For smaller groups, message us on WhatsApp — we can often arrange a private journey at a different price." },
    { question: "Why must we book 15 days ahead?", answer: "It lets us reserve the right home, vehicle and guide for your dates. For shorter notice, contact us on WhatsApp and we will check availability." },
    { question: "Is the food suitable for Ekadashi fasting?", answer: "Yes — tell us in special requests and our cook will prepare phalahar meals." },
  ],
};

/** Default photo-tour rooms by property type (edit in Admin → Properties → Media). */
function defaultPhotoTour(type: string, bedrooms: number, bathrooms: number) {
  const bed = (n: number) => ({ name: bedrooms > 1 ? `Bedroom ${n}` : "Bedroom", highlights: [n === 1 ? "King bed" : "Queen bed", "Bed linen", "Air conditioning", "Clothes storage"] });
  const bath = (n: number) => ({ name: bathrooms > 1 ? `Full bathroom ${n}` : "Full bathroom", highlights: ["Hot water", "Towels", "Body soap", "Shampoo"] });
  const exterior = { name: "Exterior", highlights: ["Free parking on premises"] };
  if (type === "studio")
    return [{ name: "Studio", highlights: ["Queen bed", "Air conditioning", "TV", "Wi-Fi"] }, { name: "Kitchenette", highlights: ["Refrigerator", "Microwave", "Kettle", "RO drinking water"] }, bath(1), exterior];
  return [
    { name: "Living room", highlights: ["Air conditioning", "TV", "Sofa", "Wi-Fi"] },
    { name: "Full kitchen", highlights: ["Refrigerator", "Microwave", "Cooking basics", "Crockery and cutlery", "RO drinking water"] },
    ...(bedrooms > 1 ? [{ name: "Dining area", highlights: ["Dining table"] }] : []),
    ...Array.from({ length: bedrooms }, (_, i) => bed(i + 1)),
    ...Array.from({ length: bathrooms }, (_, i) => bath(i + 1)),
    exterior,
  ];
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing — add it to .env.local");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || "vhi" });
  console.log(`Seeding (${DEV ? "development: sample prices, published" : "non-development: drafts, rates 0"})…`);

  /* Settings */
  await Settings.updateOne(
    { _id: "site" },
    {
      $setOnInsert: {
        business: { brandName: "Vrindavan Holiday Inn", tagline: "Luxury Homestays", address: "Vrindavan, Uttar Pradesh" },
        tax: { accommodationRate: DEV ? 12 : 0, stayFoodRate: DEV ? 12 : 0, darshanRate: DEV ? 5 : 0, mealRate: DEV ? 5 : 0, addonRate: DEV ? 18 : 0, showPricesWithTax: false, invoicePrefix: "VHI" },
        booking: { holdMinutes: 12, maxAdvanceDays: 365, defaultMinGroupSize: 4, defaultAdvanceDays: 15, defaultMealMinNights: 3 },
      },
    },
    { upsert: true },
  );
  console.log("✓ settings");

  /* Owner */
  if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
    const email = process.env.SEED_ADMIN_EMAIL.toLowerCase().trim();
    const exists = await User.exists({ email });
    if (!exists) {
      await User.create({ name: "VHI Owner", email, passwordHash: await hashPassword(process.env.SEED_ADMIN_PASSWORD), role: "owner" });
      console.log(`✓ owner ${email}`);
    } else console.log(`· owner ${email} exists (use npm run create-admin to reset password)`);
  } else console.log("· SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin user");

  /* Amenities */
  const amenityIds: mongoose.Types.ObjectId[] = [];
  for (const [i, [name, icon, group]] of AMENITIES.entries()) amenityIds.push(await upsert(Amenity, { name }, { name, icon, group, sortOrder: i }));
  console.log(`✓ ${amenityIds.length} amenities`);

  /* Meal plans */
  const bf = await upsert(MealPlan, { code: "BF" }, {
    name: "Breakfast", code: "BF", description: "A fresh sattvik breakfast each morning — poha, upma, parathas, fruit and chai.", servingInfo: "Served at the home, 8:00–10:00 am.",
    pricingModel: "per_person_per_night", adultPrice: rs(250), childPrice: rs(150), childAgeMin: 5, childAgeMax: 11, minNights: 3, nightsRule: "gte", active: true, sortOrder: 1,
  });
  const bfd = await upsert(MealPlan, { code: "BFD" }, {
    name: "Breakfast + Dinner", code: "BFD", description: "Sattvik breakfast and a home-style dinner — dal, seasonal sabzi, phulkas, rice and a sweet.", servingInfo: "Breakfast 8:00–10:00 am · Dinner 7:30–9:30 pm.",
    pricingModel: "per_person_per_night", adultPrice: rs(650), childPrice: rs(400), childAgeMin: 5, childAgeMax: 11, minNights: 3, nightsRule: "gte", active: true, sortOrder: 2,
  });
  console.log("✓ meal plans");

  /* Add-ons */
  const addOns: [string, string, string, string, string, number, string][] = [
    ["PICKDROP", "Pick & Drop", "pickup", "Car", "Station or bus-stand pickup and drop in a private car.", 900, "per_trip"],
    ["SCOOTY", "Scooty rental", "scooty", "Bike", "A scooty delivered to your door — the easiest way around Vrindavan's lanes. Licence required.", 500, "per_day"],
    ["CAB", "Cab for the day", "cab", "Car", "Private AC car with driver for local darshan, up to 8 hours.", 2500, "per_day"],
    ["SPECIAL", "Special arrangement", "special", "Sparkles", "Birthday decor, puja arrangements, a guide, or anything else — we'll confirm the price with you.", 0, "on_request"],
  ];
  for (const [i, [code, name, category, icon, description, price, unit]] of addOns.entries())
    await upsert(AddOn, { code }, { code, name, category, icon, description, price: unit === "on_request" ? 0 : rs(price), pricingUnit: unit, active: true, sortOrder: i, appliesTo: ["stay", "stay_food", "darshan"] });
  console.log("✓ add-ons");

  /* Cancellation policies (placeholders — the client must confirm wording and tiers) */
  const stayPolicy = await upsert(CancellationPolicy, { vertical: "stay", isDefault: true }, {
    name: "Standard stay policy", vertical: "stay", isDefault: true, summary: "Full refund up to 7 days before check-in; 50% up to 3 days before; no refund after that.",
    rules: [{ daysBeforeMin: 7, refundPercent: 100 }, { daysBeforeMin: 3, refundPercent: 50 }, { daysBeforeMin: 0, refundPercent: 0 }], nonRefundableLineTypes: ["addon"], fixedDeduction: 0, refundGst: true,
  });
  await upsert(CancellationPolicy, { vertical: "stay_food", isDefault: true }, {
    name: "Stay + Food policy", vertical: "stay_food", isDefault: true, summary: "Full refund up to 10 days before check-in; 50% up to 5 days before; no refund after that.",
    rules: [{ daysBeforeMin: 10, refundPercent: 100 }, { daysBeforeMin: 5, refundPercent: 50 }, { daysBeforeMin: 0, refundPercent: 0 }], nonRefundableLineTypes: ["addon"], fixedDeduction: 0, refundGst: true,
  });
  await upsert(CancellationPolicy, { vertical: "darshan", isDefault: true }, {
    name: "Darshan tour policy", vertical: "darshan", isDefault: true, summary: "Full refund up to 15 days before travel; 50% up to 7 days before; no refund after that.",
    rules: [{ daysBeforeMin: 15, refundPercent: 100 }, { daysBeforeMin: 7, refundPercent: 50 }, { daysBeforeMin: 0, refundPercent: 0 }], nonRefundableLineTypes: ["addon"], fixedDeduction: 0, refundGst: true,
  });
  console.log("✓ cancellation policies (placeholders — confirm with client)");

  /* Properties */
  const propertyIds: mongoose.Types.ObjectId[] = [];
  for (const [i, p] of PROPERTIES.entries()) {
    const isStudio = p.type === "studio";
    const beds = p.type === "villa"
      ? [{ room: "Bedroom 1", bedType: "King bed" }, { room: "Bedroom 2", bedType: "Queen bed" }, { room: "Bedroom 3", bedType: "Queen bed" }, { room: "Bedroom 4", bedType: "Two single beds" }]
      : isStudio ? [{ room: "Studio", bedType: "Queen bed" }]
      : Array.from({ length: p.bedrooms }, (_, k) => ({ room: `Bedroom ${k + 1}`, bedType: k === 0 ? "King bed" : "Queen bed" }));
    propertyIds.push(
      await upsert(Property, { slug: p.slug }, {
        name: p.name, slug: p.slug, type: p.type, label: p.label, tagline: p.tagline,
        shortDescription: `${p.tagline} A private ${isStudio ? "studio apartment" : p.type === "villa" ? "villa" : `${p.bedrooms}-bedroom home`} in ${p.area}, hosted by VHI.`,
        description: `${p.name} is a private ${isStudio ? "studio" : p.type === "villa" ? "four-bedroom villa" : `${p.bedrooms}-bedroom apartment`} — the whole home is yours for the length of your stay.\n\nMornings start with temple bells; evenings end with a quiet cup of chai after aarti. Your VHI host is a WhatsApp message away for darshan timings, cabs, scooty rentals and sattvik meals.\n\n(Sample description — replace in Admin → Properties.)`,
        highlights: ["Whole home — never shared", "Minutes from major temples", "Sattvik meals on stays of 3+ nights", "Local host on WhatsApp"],
        bedrooms: p.bedrooms, bathrooms: p.bathrooms, beds,
        occupancy: { baseGuests: Math.min(p.max, isStudio ? 2 : p.bedrooms * 2), maxGuests: p.max, maxAdults: p.max, maxChildren: Math.max(1, Math.floor(p.max / 2)) },
        extraGuest: { enabled: false, adultPerNight: 0, childPerNight: 0 },
        amenityIds: amenityIds.slice(0, isStudio ? 12 : 18),
        houseRules: ["Pure vegetarian home — no non-veg, alcohol or smoking", "Quiet hours 10 pm – 6 am", "Please remove footwear in the puja corner"],
        checkInTime: "14:00", checkOutTime: "11:00", stayRules: { minNights: 1, maxNights: 30 },
        location: { area: p.area, city: "Vrindavan", nearby: [{ name: "Banke Bihari Temple", distance: "—" }, { name: "Prem Mandir", distance: "—" }, { name: "ISKCON Vrindavan", distance: "—" }] },
        pricing: { baseRate: rs(p.rate), weekendRate: rs(Math.round(p.rate * 1.15)), weekendDays: [5, 6] },
        photoTour: defaultPhotoTour(p.type, p.bedrooms, p.bathrooms),
        pricingSource: "local", status: "active", featured: !!p.featured, sortOrder: i,
        mealPlanIds: [bf, bfd], cancellationPolicyId: stayPolicy, publishing,
        seo: { metaTitle: `${p.name} · Luxury ${isStudio ? "Studio" : p.type === "villa" ? "Villa" : "Homestay"} in Vrindavan | VHI` },
      }),
    );
  }
  // Existing properties (seeded earlier) get default photo-tour rooms only if they have none yet.
  for (const p of PROPERTIES)
    await Property.updateOne({ slug: p.slug, $or: [{ photoTour: { $exists: false } }, { photoTour: { $size: 0 } }] }, { $set: { photoTour: defaultPhotoTour(p.type, p.bedrooms, p.bathrooms) } });
  console.log(`✓ ${propertyIds.length} properties (existing ones left unchanged)`);

  /* Itineraries + Stay & Food packages */
  const daysFor = (n: number) => {
    const pool = [
      { title: "Arrive & settle in", summary: "Check in, rest, and walk to your nearest temple for evening aarti.", items: ["Welcome sattvik dinner at home", "Evening aarti at a nearby temple"] },
      { title: "The heart of Vrindavan", summary: "Banke Bihari, Radha Raman and Nidhivan — Vrindavan's oldest and most loved shrines.", items: ["Early darshan at Banke Bihari", "Radha Raman temple", "Sunset at Nidhivan"] },
      { title: "Prem Mandir & ISKCON", summary: "Marble, light and kirtan.", items: ["ISKCON morning kirtan", "Prem Mandir evening light show"] },
      { title: "Yamuna day", summary: "Keshi Ghat, a boat on the Yamuna and the evening Yamuna aarti.", items: ["Boat ride at Keshi Ghat", "Yamuna aarti"] },
      { title: "Govardhan", summary: "A drive to Govardhan and Radha Kund — walk part of the parikrama if you wish.", items: ["Mansi Ganga", "Radha Kund & Shyam Kund"] },
      { title: "Barsana & Nandgaon", summary: "The hill-top temples of Radha Rani and Nand Baba.", items: ["Shriji temple, Barsana", "Nand Bhawan, Nandgaon"] },
      { title: "Slow morning & departure", summary: "A last darshan and breakfast before you leave.", items: ["Parikrama path walk", "Breakfast and check-out"] },
    ];
    return Array.from({ length: n }, (_, k) => ({ day: k + 1, ...(k === n - 1 ? pool[6] : pool[Math.min(k, 5)]) }));
  };
  for (const nights of [3, 5, 7]) {
    const itin = await upsert(Itinerary, { title: `${nights}-night Vrindavan itinerary` }, { title: `${nights}-night Vrindavan itinerary`, nights, summary: "A suggested rhythm — change anything on the day.", days: daysFor(nights + 1), printedCopyIncluded: true });
    await upsert(StayPackage, { slug: `${nights}-nights-stay-sattvik-food` }, {
      title: `${nights} Nights · Stay + Sattvik Food`, slug: `${nights}-nights-stay-sattvik-food`, nights,
      tagline: nights === 3 ? "A long weekend in Braj, fully looked after." : nights === 5 ? "Time for every temple, and time for yourself." : "A week to live Vrindavan's rhythm.",
      description: `${nights} nights in a private VHI home with sattvik meals cooked fresh every day, and a complimentary itinerary printed and waiting at check-in.\n\nChoose your home and meal plan — the price updates as you go.`,
      propertyIds: [], mealPlanIds: [bf, bfd], pricingMode: "dynamic",
      inclusions: [`${nights} nights in a private VHI home`, "Sattvik breakfast (or breakfast + dinner)", "Complimentary printed itinerary", "Local food recommendations", "WhatsApp host support"],
      exclusions: ["Transport (add a cab or scooty)", "Temple donations", "Lunch"],
      itineraryId: itin, featured: nights === 5, sortOrder: nights,
      localRecommendations: [{ title: "Brijwasi mithai", description: "Peda and rabri from the old market." }, { title: "Govind Bhojanalaya-style thali", description: "Simple temple-town thali for lunch." }],
      publishing,
    });
  }
  console.log("✓ itineraries & 3 Stay + Food packages");

  /* Darshan tours — client prices */
  const tours = [
    {
      slug: "vrindavan-mathura-darshan-1n-2d", title: "Vrindavan & Mathura Darshan", durationLabel: "1 Night / 2 Days", nights: 1, days: 2, price: 5999, eyebrow: "The essential journey",
      subtitle: "Krishna's birthplace and Vrindavan's most loved temples in two unhurried days.",
      overview: "Begin at Shri Krishna Janmabhoomi in Mathura, then settle into Vrindavan for Banke Bihari, Radha Raman, Nidhivan and the evening lights of Prem Mandir.\n\nA VHI home, sattvik meals, a private vehicle and a local guide are all included — you simply follow the bells.",
      highlights: ["Shri Krishna Janmabhoomi, Mathura", "Banke Bihari & Radha Raman", "Prem Mandir light show", "ISKCON kirtan"],
      itinerary: [
        { day: 1, title: "Mathura & Vrindavan", summary: "Pickup, Mathura's sacred sites, then Vrindavan by evening.", items: ["Pickup from Mathura Junction", "Shri Krishna Janmabhoomi & Dwarkadhish temple", "Vishram Ghat", "Check in to your VHI home", "Prem Mandir evening light show", "Sattvik dinner"] },
        { day: 2, title: "Heart of Vrindavan", summary: "The old temples of Vrindavan, then onward travel.", items: ["Optional mangla aarti", "Banke Bihari darshan", "Radha Raman & Radha Vallabh", "Nidhivan", "ISKCON temple", "Drop at station / bus stand"] },
      ],
      inclusions: ["1 night in a private VHI home", "Sattvik breakfast & dinner", "Private AC vehicle with driver", "Local guide for darshan", "Pickup & drop in Mathura/Vrindavan"],
      travelFacts: [{ label: "Start", value: "Mathura, 9 am" }, { label: "End", value: "Vrindavan, 6 pm" }, { label: "Pace", value: "Easy" }],
    },
    {
      slug: "braj-darshan-govardhan-barsana-2n-3d", title: "Braj Darshan: Govardhan & Barsana", durationLabel: "2 Nights / 3 Days", nights: 2, days: 3, price: 8999, eyebrow: "Most popular",
      subtitle: "Vrindavan, Govardhan and Radha Rani's Barsana — the three heartbeats of Braj.",
      overview: "Three days across Braj: Vrindavan's temples and ghats, the sacred hill of Govardhan with Radha Kund, and the hill-top Shriji temple at Barsana.\n\nEvenings are yours at a private VHI home, with sattvik dinner waiting.",
      highlights: ["Govardhan & Radha Kund", "Shriji temple, Barsana", "Yamuna aarti at Keshi Ghat", "All major Vrindavan temples"],
      itinerary: [
        { day: 1, title: "Arrive in Vrindavan", summary: "Pickup and an evening of Vrindavan's temples.", items: ["Pickup from Mathura", "Check in to your VHI home", "Banke Bihari & Radha Raman", "Keshi Ghat & Yamuna aarti", "Sattvik dinner"] },
        { day: 2, title: "Govardhan & Barsana", summary: "A full day in the heart of Braj.", items: ["Early breakfast", "Govardhan: Mansi Ganga, Daan Ghati", "Radha Kund & Shyam Kund", "Lunch on the road", "Shriji temple, Barsana", "Nand Bhawan, Nandgaon (time permitting)"] },
        { day: 3, title: "Prem Mandir & departure", summary: "A final morning in Vrindavan.", items: ["ISKCON morning kirtan", "Nidhivan & Seva Kunj", "Prem Mandir", "Drop at station / bus stand"] },
      ],
      inclusions: ["2 nights in a private VHI home", "Sattvik breakfast & dinner", "Private AC vehicle with driver", "Local guide", "Pickup & drop in Mathura/Vrindavan"],
      travelFacts: [{ label: "Start", value: "Mathura / Vrindavan" }, { label: "Distance", value: "≈ 150 km" }, { label: "Pace", value: "Moderate" }],
    },
    {
      slug: "complete-braj-yatra-3n-4d", title: "Complete Braj Yatra", durationLabel: "3 Nights / 4 Days", nights: 3, days: 4, price: 11999, eyebrow: "The full circle",
      subtitle: "Mathura, Vrindavan, Gokul, Govardhan, Barsana and Nandgaon — Krishna's whole childhood, unhurried.",
      overview: "Our most complete journey: four days that trace Krishna's life from Mathura to Gokul, the Govardhan hill, and Radha Rani's Barsana.\n\nYou return each night to the same private VHI home, so there is no packing and unpacking — just darshan, prasad and rest.",
      highlights: ["Gokul & Raman Reti", "Govardhan parikrama (by car or on foot)", "Barsana & Nandgaon", "Yamuna boat ride"],
      itinerary: [
        { day: 1, title: "Mathura", summary: "Arrive in Krishna's birthplace.", items: ["Pickup from Mathura Junction", "Shri Krishna Janmabhoomi", "Dwarkadhish temple", "Vishram Ghat aarti", "Check in, sattvik dinner"] },
        { day: 2, title: "Gokul & Vrindavan", summary: "Krishna's childhood home and Vrindavan's great temples.", items: ["Gokul & Raman Reti", "Banke Bihari & Radha Raman", "Nidhivan", "Prem Mandir lights"] },
        { day: 3, title: "Govardhan, Barsana, Nandgaon", summary: "A full day across Braj.", items: ["Govardhan parikrama by car (on foot on request)", "Radha Kund", "Barsana Shriji temple", "Nandgaon"] },
        { day: 4, title: "Yamuna & departure", summary: "A gentle last morning.", items: ["Boat ride at Keshi Ghat", "ISKCON temple", "Drop at station / bus stand"] },
      ],
      inclusions: ["3 nights in a private VHI home", "Sattvik breakfast & dinner", "Private AC vehicle with driver", "Local guide", "Yamuna boat ride", "Pickup & drop in Mathura/Vrindavan"],
      travelFacts: [{ label: "Start", value: "Mathura" }, { label: "Distance", value: "≈ 220 km" }, { label: "Pace", value: "Relaxed" }],
    },
  ];
  const tourIds: mongoose.Types.ObjectId[] = [];
  for (const [i, t] of tours.entries()) {
    tourIds.push(
      await upsert(DarshanTour, { slug: t.slug }, {
        ...TOUR_COMMON,
        title: t.title, slug: t.slug, durationLabel: t.durationLabel, nights: t.nights, days: t.days, eyebrow: t.eyebrow, subtitle: t.subtitle, overview: t.overview,
        highlights: t.highlights, itinerary: t.itinerary, inclusions: t.inclusions, travelFacts: t.travelFacts,
        stayInfo: `${t.nights} night${t.nights > 1 ? "s" : ""} in a private VHI home in Vrindavan (twin-sharing), assigned to your group after booking. Upgrades to Kripa Nikunj villa for larger groups on request.`,
        stayPropertyIds: propertyIds.slice(0, 4),
        pricing: { adultPrice: t.price * 100, priceBasisNote: "per person · twin sharing · stay, meals, vehicle & guide included", groupTiers: [] },
        featured: i === 1, sortOrder: i, publishing,
        seo: { metaTitle: `${t.title} (${t.durationLabel}) · ₹${t.price.toLocaleString("en-IN")} per person | VHI`, metaDescription: t.subtitle },
      }),
    );
  }
  for (const id of tourIds)
    await DarshanTour.updateOne({ _id: id, $or: [{ relatedTourIds: { $exists: false } }, { relatedTourIds: { $size: 0 } }] }, { $set: { relatedTourIds: tourIds.filter((x) => !x.equals(id)) } });
  console.log("✓ 3 Darshan tours (₹5,999 / ₹8,999 / ₹11,999 per person)");

  /* Experiences */
  const exps = [
    ["Banke Bihari Temple", "Temple", "Vrindavan's most beloved deity, glimpsed between curtains that close every few moments.", "Early morning"],
    ["Prem Mandir", "Temple", "White Italian marble that glows through a sequence of coloured lights after dusk.", "After sunset"],
    ["ISKCON Vrindavan", "Temple", "Kirtan that seems never to stop, and a calm courtyard to sit in.", "Morning aarti"],
    ["Keshi Ghat", "Ghat", "The Yamuna, old sandstone steps and the evening aarti.", "Sunset"],
    ["Nidhivan", "Sacred grove", "A grove of twisted tulsi trees said to be Krishna's nightly rasa-lila ground.", "Before closing"],
    ["Govardhan", "Parikrama", "The sacred hill Krishna lifted — walk or drive its 21-km parikrama.", "Early morning"],
    ["Barsana", "Temple", "Radha Rani's hilltop temple, famous for Lathmar Holi.", "Afternoon"],
    ["Radha Raman Temple", "Temple", "A 16th-century self-manifested deity, worshipped with exquisite care.", "Midday"],
  ];
  for (const [i, [title, category, description, bestTime]] of exps.entries()) await upsert(Experience, { title }, { title, category, description, bestTime, sortOrder: i, publishing: { status: "published" } });
  console.log("✓ experiences");

  /* Homepage slider banners — upload a photo to each in Admin → Banners */
  const banners = [
    { eyebrow: "Luxury homestays in Vrindavan", title: "Vrindavan,", titleAccent: "as it’s meant to be experienced.", subtitle: "Comfortable stays, sattvik food and soulful darshan experiences for a more meaningful yatra.", textTone: "dark", ctaLabel: "", ctaHref: "" },
    { eyebrow: "Darshan Tours · from ₹5,999 per person", title: "Walk the land of Krishna,", titleAccent: "at the pace of devotion.", subtitle: "Guided journeys to Vrindavan, Govardhan and Barsana with stay, sattvik meals and a private vehicle included.", textTone: "light", ctaLabel: "Explore journeys", ctaHref: "/darshan-tours" },
    { eyebrow: "Stay + Sattvik Food", title: "Home-cooked,", titleAccent: "no onion, no garlic.", subtitle: "Three, five or seven nights with fresh sattvik breakfast and dinner at your private VHI home.", textTone: "dark", ctaLabel: "See packages", ctaHref: "/stay-food" },
  ];
  for (const [i, b] of banners.entries())
    await Banner.updateOne({ title: b.title, placement: "home_hero" }, { $setOnInsert: { ...b, placement: "home_hero", sortOrder: i, publishing: { status: "published" } } }, { upsert: true });
  console.log("✓ 3 homepage slider banners (add photos in Admin → Banners)");

  /* FAQs (general wording — the client should review) */
  const faqs: [string, string, string, boolean][] = [
    ["Is the whole property ours, or is it shared?", "Every VHI stay is a private home. You get the whole apartment or villa for your stay.", "stay", true],
    ["What are check-in and check-out times?", "Check-in and check-out times are listed on each property page. Early check-in or late check-out depends on availability — just ask on WhatsApp.", "stay", true],
    ["When are meal plans available?", "Sattvik breakfast, or breakfast and dinner, can be added to stays of 3 nights or more. Choose it while booking.", "stay_food", true],
    ["Is the food onion- and garlic-free?", "Yes. All VHI meals are pure vegetarian and sattvik — no onion and no garlic.", "stay_food", false],
    ["How do Darshan tours work?", "Choose a journey, a date at least 15 days away and a group of at least 4. Stay, meals, a private vehicle and a guide are included.", "darshan", true],
    ["How do I pay?", "Securely online with UPI, cards or net banking through Razorpay. Your booking is confirmed instantly after payment.", "payments", true],
    ["What if my payment fails?", "Your dates are held for a few minutes. You can retry from your booking page; if money was deducted without confirmation, it is either confirmed automatically or refunded.", "payments", false],
    ["Can I get a GST invoice?", "Yes. Add your GSTIN at checkout and we'll issue a tax invoice.", "payments", false],
    ["Where exactly is the property?", "The area is shown on each listing; the exact address and directions are shared after booking.", "general", false],
  ];
  for (const [i, [question, answer, category, home]] of faqs.entries()) await upsert(Faq, { question }, { question, answer, category, showOnHomepage: home, sortOrder: i, publishing: { status: "published" } });
  console.log("✓ FAQs");

  /* Pages (drafted wording — review with the client / legal counsel before launch) */
  await upsert(Page, { slug: "about" }, {
    slug: "about", title: "About VHI", intro: "VHI — Vrindavan Holiday Inn — is a small collection of private homes in Vrindavan, run by a local family.",
    body: "We started VHI because pilgrims deserved a better place to come home to after darshan: clean, private, calm, and cared for by people who know Braj.\n\n## What we believe\n\nHospitality in Vrindavan should feel like seva. That means honest prices, spotless homes, sattvik food, and hosts who pick up the phone.\n\n## Hosted by\n\nOur hosts live in Vrindavan and are available on WhatsApp throughout your stay.",
    publishing: { status: "published" },
  });
  await upsert(Page, { slug: "privacy-policy" }, {
    slug: "privacy-policy", title: "Privacy policy", intro: "How VHI collects, uses and protects your information.",
    body: "## What we collect\n\n- Your name, phone number, email and city when you book or enquire\n- Booking details such as dates, guests and special requests\n- Payment confirmations from Razorpay (we never see or store your card or UPI details)\n- Anonymous website usage data through cookies and analytics tools\n\n## How we use it\n\nTo confirm and manage your booking, send confirmations on WhatsApp and email, issue invoices, improve our website, and measure our advertising.\n\n## Sharing\n\nWe share only what is needed with service providers who help us operate (payments, messaging, email, hosting, analytics and our channel manager). We do not sell your data.\n\n## Your choices\n\nYou can ask us to access, correct or delete your personal data by writing to us.\n\n(Draft — review with legal counsel before launch.)",
    publishing: { status: "published" },
  });
  await upsert(Page, { slug: "terms" }, {
    slug: "terms", title: "Terms & conditions", intro: "The terms that apply when you book with VHI.",
    body: "## Bookings\n\nA booking is confirmed once full payment is received and a booking ID is issued.\n\n## House rules\n\nVHI homes are pure vegetarian. Smoking, alcohol and non-vegetarian food are not permitted. Guests are responsible for damage beyond normal use.\n\n## Darshan tours\n\nTemple timings, crowds and road conditions can change plans; your guide may adjust the order of visits.\n\n## Cancellations\n\nCancellations and refunds follow the cancellation policy shown at the time of booking.\n\n(Draft — review with legal counsel before launch.)",
    publishing: { status: "published" },
  });
  console.log("✓ pages");

  await mongoose.disconnect();
  console.log("\nDone. Sign in at /admin/login and complete prices, photos and policies.");
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
