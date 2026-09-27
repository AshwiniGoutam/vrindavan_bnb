# Vrindavan Holiday Inn (VHI) — Technical Specification v1.1

Status: In implementation (Phase 0) · Stack: Next.js (App Router) · TypeScript · Tailwind CSS · MongoDB Atlas + Mongoose · Cloudinary · Razorpay · WhatsApp provider · eZee (Yanolja) channel manager · Vercel

This document is the single source of truth for building the platform. Anything the client has asked to control from admin must never be hard-coded.

---

## 0. Key decisions and interpretations

These are decisions made while turning the requirements into a design. Each one should be confirmed before implementation begins.

| # | Topic | Decision |
|---|---|---|
| D1 | Inventory truth | The channel manager (eZee) is the source of truth for accommodation availability. The website keeps only a **short-lived lock ledger** (`inventoryLocks`) to prevent double-booking during checkout and during channel-manager sync lag. This is a concurrency guard, not a second inventory. |
| D2 | Unit model | Every property is booked as one whole unit (the whole apartment or villa). The data model has a `units` field (default 1) so multi-unit properties work later without restructuring. |
| D3 | Money | All amounts are stored as **integer paise**. Nothing is ever stored or computed as floating-point rupees. |
| D4 | Pricing authority | A `pricingSource` setting per property: `local` (website pricing engine, default) or `channel` (rates read from eZee). Offers, meal plans, add-ons, and GST are always computed locally. |
| D5 | Price snapshot | Every booking stores a full, immutable price breakdown, including the GST rates used. Changing prices later never alters an existing booking. |
| D6 | Meal eligibility | Meals are available when `nights >= mealPlan.minNights` (default 3), in both the normal stay flow and the Stay + Food packages. |
| D7 | Booking vs payment status | These are two separate fields. "Refunded" is a payment status; the admin UI shows a combined badge. |
| D8 | Admin mutations | All admin mutations go through `/api/admin/*` route handlers wrapped in `withAdmin(permission)`. This gives one enforcement point for RBAC, validation, and audit logging. |
| D9 | Background work | Notifications and channel-manager pushes use an **outbox pattern** (a Mongo collection plus a cron retry). A slow or failed WhatsApp or eZee call never fails a paid booking. |
| D10 | Hosting | Vercel **Pro** is required: commercial use, per-minute cron jobs, and longer function timeouts. |
| D12 | Meal eligibility | Stored per meal plan as `{ minNights, comparison: "gte" \| "gt" }`, defaulting to `3, gte` (3 nights or more). The brief was ambiguous, so the rule is a setting, not code. |
| D13 | Calendar dates | Stored as `"YYYY-MM-DD"` strings for the IST calendar day (nights, travel dates, rule ranges, locks). This avoids timezone drift between server (UTC), guests and admins. |
| D14 | Admin auth | Custom database sessions instead of Auth.js: a random token in an httpOnly cookie, only its SHA-256 hash stored, revocable server-side; passwords hashed with Node's built-in scrypt (no native dependencies on Vercel). |
| D11 | Multilingual | English only at launch. Content documents include an optional `translations` map, and the UI reads text through a `localized(doc, field, locale)` helper, so Hindi can be added without schema changes. |

---

## 1. Architecture

### 1.1 High-level layout

```
                    ┌────────────────────────────── Vercel ───────────────────────────────┐
 Guest browser ───▶ │  Next.js App Router                                                  │
 Admin browser ──▶  │   (site) pages  ── Server Components, ISR + tag revalidation         │
                    │   (admin) pages ── auth-gated, RBAC                                  │
                    │   /api/*        ── public API, admin API, webhooks, cron             │
                    │                                                                      │
                    │   src/server/services   (domain logic, framework-agnostic)          │
                    │   src/server/providers  (adapters to external systems)              │
                    └───────┬──────────────┬──────────────┬─────────────┬────────────────┘
                            │              │              │             │
                     MongoDB Atlas    Cloudinary     Razorpay     eZee / WhatsApp / Email
                     (Mumbai)         (media CDN)    (payments)   (via provider interfaces)
```

### 1.2 Layering rules

1. **Pages and route handlers** are thin. They parse input with Zod, call a service, and return the result.
2. **Services** (`src/server/services`) hold all business logic, including pricing, availability, booking lifecycle, discounts, invoices, and analytics. They never import Next.js.
3. **Providers** (`src/server/providers`) wrap every external system behind an interface. Services depend only on the interface.
4. **Models** (`src/server/models`) are Mongoose schemas. Only services and repositories touch them.

### 1.3 Provider interfaces

```ts
// Channel manager: selected by env CHANNEL_MANAGER_PROVIDER = "manual" | "ezee"
interface ChannelManagerProvider {
  getAvailability(q: { externalIds: string[]; from: Date; to: Date }): Promise<AvailabilityMap>;
  getRates?(q: { externalIds: string[]; from: Date; to: Date }): Promise<RateMap>;
  createReservation(r: CMReservationInput): Promise<{ externalReservationId: string }>;
  cancelReservation(externalReservationId: string, reason?: string): Promise<void>;
  modifyReservation?(externalReservationId: string, r: CMReservationInput): Promise<void>;
  healthCheck(): Promise<{ ok: boolean; message?: string }>;
}
// ManualAvailabilityProvider: reads admin-managed blocks (dev, staging, and pre-integration production)
// EzeeChannelManagerProvider: implemented once API docs and credentials arrive

interface PaymentProvider {          // RazorpayProvider
  createOrder(i: { amountPaise: number; receipt: string; notes: Record<string,string> }): Promise<{ orderId: string }>;
  verifyCheckoutSignature(i: { orderId: string; paymentId: string; signature: string }): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  fetchPayment(paymentId: string): Promise<PaymentInfo>;
  refund(i: { paymentId: string; amountPaise: number; notes?: Record<string,string> }): Promise<RefundInfo>;
}

interface WhatsAppProvider {         // MetaCloudProvider | InteraktProvider | AiSensyProvider | ConsoleProvider
  sendTemplate(i: { to: string; template: string; language: string; variables: string[] }): Promise<{ messageId: string }>;
  verifyWebhook?(req: Request): Promise<boolean>;
}

interface EmailProvider {            // ResendProvider | SesProvider | ConsoleProvider
  send(i: { to: string; subject: string; html: string; attachments?: Attachment[] }): Promise<{ id: string }>;
}

interface MediaProvider {            // CloudinaryProvider
  signUpload(i: { folder: string; resourceType: "image" | "video" }): SignedUploadParams;
  destroy(publicId: string, resourceType: "image" | "video"): Promise<void>;
}
```

### 1.4 Availability and inventory locking (core algorithm)

Available(property, night) is true only when all of the following hold:

1. The property is `status: published` and not in maintenance for that night.
2. The channel manager reports it available (results are cached in `availabilityCache` for 2–5 minutes and always re-checked live before creating a payment order).
3. No active document exists in `inventoryLocks` for (propertyId, night).

**Locks.** `inventoryLocks` has a **unique index on `{ propertyId, unitIndex, night }`**. A checkout inserts one lock per night inside a Mongo transaction. A duplicate-key error means someone else took the dates, so the checkout returns "no longer available." Lock types:

- `hold`: the lock has `expiresAt = now + settings.booking.holdMinutes` (default 12). A TTL index deletes it automatically.
- `booked`: set on payment success. It has no TTL until the channel manager confirms the reservation. After confirmation, the lock is kept until checkout date + 1 day and then pruned by cron. This covers eZee propagation lag.

**Payment after hold expiry.** If a Razorpay webhook arrives for a booking whose hold has expired, the system tries to re-acquire the locks and re-check with the channel manager.
- If the dates are still free, the booking is confirmed normally.
- If they are taken, the booking is marked `failed_inventory`, an automatic full refund is issued, and admins get an URGENT WhatsApp alert.

**Darshan tours with a VHI property.** The same locking and channel-manager push apply to the linked property and nights. If the tour's allocation mode is `manual`, no lock is taken at booking time; the admin assigns a property later, and the lock plus channel-manager push happen at that point.

**Tour capacity.** Capacity is tracked in `tourDepartures` using an atomic `$inc` with a condition (`booked + n <= capacity`). For any-date tours, the departure document is created on demand from the tour's default daily capacity.

### 1.5 Pricing engine (`PricingService.quote`)

The engine is a pure, deterministic function that runs on the server only. The client never sends prices.

**Stay quote**
1. Nightly rate per night, in this resolution order: date override → festival or season rule (highest priority wins) → weekend rate (configured weekdays) → base rate. If `pricingSource = channel`, the channel-manager rate replaces steps 1–4.
2. Extra guest charges: guests above `baseOccupancy`, per night, with separate adult and child rates.
3. Meal plan (optional, only if eligible): `nights × (adults × adultPrice + children_in_age_band × childPrice)`, based on the plan's `pricingModel` (`per_person_per_night` by default, `per_booking_per_night` also supported).
4. Add-ons: priced per unit, per person, per day, or per trip.
5. Strike-through price (display only): computed from `compareAtRate` or an active auto-offer.
6. Discount: one auto-offer **or** one coupon (no stacking by default; `settings.discounts.allowStacking` can enable it). The discount applies to the lines it targets.
7. GST: calculated per line using the rate for that line's vertical (`accommodation`, `stay_food`, `darshan`, `addon`, `meal`), with optional slab rules by per-night tariff. The rate is snapshotted.
8. Rounding happens per line in paise. The total equals the sum of all lines.

**Stay + Food package quote.** The package's `pricingMode` is one of:
- `fixed_per_package`
- `fixed_per_person`
- `dynamic` (property nights + meal plan + package inclusions)

The package's number of nights is fixed (3, 5, or 7).

**Darshan quote**
- Base: `adults × adultPrice + children × childPrice`.
- A group tier replaces the base price when the group size is within a tier's range.
- Extra beds, single supplement, vehicle surcharge (if the group exceeds the default vehicle's capacity), and add-ons are added on top.
- Discount and GST are applied last.
- Validation: `minGroup <= people <= maxGroup` and `travelDate >= today + advanceDays` (IST). If the date is too soon, the API returns `code: "ADVANCE_WINDOW"` so the UI can show the WhatsApp message instead of a booking form.

Each quote returns a `quoteToken`, an HMAC-signed payload containing the inputs and totals, valid for 15 minutes. Booking creation recomputes the quote and rejects it if the totals differ.

### 1.6 Rendering and caching

- Public content pages (home, stays, tours, packages) are Server Components with ISR. Admin "Publish" calls `revalidateTag("tour:<slug>")` and similar tags.
- Draft preview uses Next.js Draft Mode, available to admins only.
- Prices and availability are never statically cached. They come from `/api/quote` and `/api/availability` at request time.
- Images are delivered through Cloudinary `f_auto,q_auto` with responsive `w_` transforms, using a custom Next `images.loader`.

### 1.7 Security

- **Admin authentication:** custom database sessions (see D14), scrypt password hashes, httpOnly Secure SameSite=Lax cookies, TOTP 2FA (required for Owner when `settings.security.ownerRequire2FA` is on), and account lockout after 5 failed attempts.
- **RBAC:** enforced server-side in `withAdmin(permission)`. The UI hides controls too, but that is never the enforcement.
- **Input:** all input is validated with Zod. Mongoose `strictQuery` is on, and query objects are sanitized (no `$` keys from input).
- **Rate limiting:** a Mongo TTL-backed counter on quote, booking, enquiry, coupon, and login endpoints.
- **Webhooks:** Razorpay HMAC verification on the raw body, WhatsApp verify token plus signature check, and an idempotency table (`webhookEvents`, unique on `provider + eventId`).
- **Secrets:** stored in Vercel environment variables per environment only. Nothing is committed. `.env.example` lists the keys.
- **Guest PII:** never rendered on public pages. Booking lookup requires booking code plus phone (and OTP later). An anonymization job replaces PII with hashes after the retention period.
- **Headers:** CSP (allowing Razorpay, Cloudinary, GA4, and Meta domains), HSTS, X-Frame-Options (DENY on admin), and Referrer-Policy.

---

## 2. MongoDB schema (Mongoose)

### 2.1 Shared embedded types

```ts
type Paise = number;                       // integer
type MediaRef = {
  publicId: string; url: string; resourceType: "image" | "video";
  width?: number; height?: number; alt: string; caption?: string; sortOrder: number;
  blurDataUrl?: string;                    // tiny LQIP for editorial image fades
};
type Seo = {
  metaTitle?: string; metaDescription?: string; ogImage?: MediaRef;
  canonicalUrl?: string; noIndex?: boolean; keywords?: string[];
};
type Publishing = { status: "draft" | "published" | "unpublished"; publishedAt?: Date; publishedBy?: ObjectId };
type Faq = { question: string; answer: string; sortOrder: number };
type Translations = { hi?: Record<string, unknown> };   // reserved for later
// Every collection also has: timestamps (createdAt, updatedAt), createdBy, updatedBy
```

### 2.2 Collections

**properties**
```ts
{
  name, slug (unique), type: "studio" | "1bhk" | "2bhk" | "3bhk" | "4bhk" | "villa",
  label?: string,                          // e.g. "ATT" for Braj Casa; meaning to be confirmed with client
  tagline, shortDescription, description (rich text),
  collections: string[],                   // filter chips, e.g. "Near Prem Mandir", "Family"
  bedrooms, bathrooms, beds: [{ room: string; bedType: string; count: number; image?: MediaRef }],
  occupancy: { baseGuests, maxGuests, maxAdults, maxChildren, childAgeMax },
  extraGuest: { adultPerNight: Paise, childPerNight: Paise, enabled: boolean },
  amenities: ObjectId[] (ref amenities),
  houseRules: string[], checkInTime: "14:00", checkOutTime: "10:00",
  stayRules: { minNights, maxNights, advanceBookingDaysMax, sameDayCutoffTime? },
  location: { area, city: "Vrindavan", approx: { lat, lng }, exactAddress (private), directions (private) },
  gallery: MediaRef[], coverImage: MediaRef,
  pricing: { baseRate: Paise, compareAtRate?: Paise, weekendRate?: Paise, weekendDays: number[] },
  pricingSource: "local" | "channel",
  units: 1,
  channel: { provider: "ezee" | "manual", externalPropertyId?, externalRoomTypeId?, externalRatePlanId?, lastSyncedAt? },
  status: "active" | "maintenance" | "inactive",
  maintenance?: { from: Date; to?: Date; note?: string },
  featured: boolean, sortOrder: number,
  cancellationPolicy: ObjectId,
  mealPlanIds: ObjectId[],                 // meal plans offered at this property
  addOnIds: ObjectId[],
  publishing: Publishing, seo: Seo, faqs: Faq[], translations?: Translations,
  deletedAt?: Date                         // soft delete
}
Indexes: slug unique; { "publishing.status": 1, status: 1, featured: -1, sortOrder: 1 }
```

**amenities**: `{ name, icon (lucide name), group: "Essentials" | "Kitchen" | …, sortOrder }`

**priceRules** (date overrides, seasons, festivals)
```ts
{
  name, kind: "date_override" | "season" | "festival",
  scope: { propertyIds: ObjectId[] | "all" },
  dateRanges: [{ from: Date, to: Date }],
  adjustment: { type: "fixed_rate" | "percent" | "flat_delta", value: number },
  minNights?: number, priority: number, active: boolean
}
Index: { active: 1, "dateRanges.from": 1, "dateRanges.to": 1 }
```

**manualBlocks** (used by ManualAvailabilityProvider): `{ propertyId, from, to, reason: "owner" | "ota" | "maintenance" | "other", note }`

**availabilityCache**: `{ propertyId, night: Date, available: boolean, rate?: Paise, fetchedAt }`, with a TTL index on `fetchedAt` (300 seconds) and a unique index on `{ propertyId, night }`.

**inventoryLocks**
```ts
{ propertyId, unitIndex: 0, night: Date (IST midnight as UTC), type: "hold" | "booked",
  bookingId, expiresAt?: Date, cmSynced: boolean }
Indexes: unique { propertyId, unitIndex, night }; TTL on expiresAt (expireAfterSeconds: 0)
```

**mealPlans**
```ts
{ name: "Breakfast" | "Breakfast + Dinner" | …, code, description, servingInfo, timings, location, instructions,
  pricingModel: "per_person_per_night" | "per_booking_per_night",
  adultPrice: Paise, childPrice: Paise, childAgeMin, childAgeMax, infantsFree: boolean,
  minNights: 3, applicablePropertyIds: ObjectId[] | "all", applicablePackageIds: ObjectId[],
  appliesTo: "all_nights",                  // reserved for "selected_nights" later
  image?: MediaRef, active: boolean, sortOrder }
```

**stayFoodPackages**
```ts
{ title, slug, nights: 3 | 5 | 7 | number, tagline, description, heroImage, gallery: MediaRef[],
  eligiblePropertyIds: ObjectId[], mealPlanIds: ObjectId[], defaultMealPlanId,
  pricingMode: "fixed_per_package" | "fixed_per_person" | "dynamic",
  price?: Paise, compareAtPrice?: Paise,
  inclusions: string[], exclusions: string[], localRecommendations: [{ title, description, type, mapUrl? }],
  itinerary: { days: ItineraryDay[]; pdf?: MediaRef; printedCopyIncluded: boolean },
  validFrom?, validTo?, cancellationPolicy: ObjectId,
  publishing, seo, faqs, featured, sortOrder }
ItineraryDay = { day: number; title: string; summary?: string; items: [{ time?: string; text: string }]; image?: MediaRef }
```

**tours** (Darshan)
```ts
{ title, slug, durationLabel: "1 Night / 2 Days", nights, days,
  startLocation: { city: "Mathura", pickupPoints: string[] }, endLocation?,
  heroEyebrow, heroTitle, heroSubtitle, heroImage, gallery,
  bookingMode: "online" | "enquiry" | "both",
  pricing: { adultPrice: Paise, childPrice?: Paise, childAgeMax?, compareAtPrice?: Paise,
             extraBedPrice?: Paise, singleSupplement?: Paise,
             groupTiers: [{ minPeople, maxPeople, adultPrice: Paise }], priceBasisNote: string },
  group: { min: 4, max?: number },
  advanceDays: 15,
  dateMode: "any_date" | "fixed_dates", defaultDailyCapacity?: number,
  blackoutDates: Date[],
  vehicles: [{ name, capacity, surcharge?: Paise }],
  highlights: string[],
  itinerary: ItineraryDay[],
  inclusions: string[], exclusions: string[],
  travelInfo: [{ title: string; body: string; facts: [{ label, value }] }],   // "Travelling from Mathura" blocks
  pickupDrop: { body: string; points: string[] },
  stay: { included: boolean; description: string; propertyIds: ObjectId[]; allocation: "auto" | "manual"; roomBasis: string },
  meals: { included: boolean; description: string; mealPlanId?: ObjectId },
  trustStats: [{ label, value, description }],
  faqs: Faq[], relatedTourIds: ObjectId[], cancellationPolicy: ObjectId, addOnIds: ObjectId[],
  publishing, seo, featured, sortOrder, translations? }
```

**tourDepartures**: `{ tourId, date, capacity, booked, status: "open" | "closed" | "sold_out", priceOverride?: Paise }`, with a unique index on `{ tourId, date }`.

**addOns**
```ts
{ name, code, category: "pickup" | "drop" | "scooty" | "cab" | "special" | "other",
  description, image?, pricingUnit: "per_trip" | "per_day" | "per_person" | "per_booking" | "on_request",
  price: Paise, gstVertical: "addon", maxQty?, requiresDetails: boolean,
  detailFields: [{ key: "flightOrTrain" | "arrivalTime" | "pickupLocation" | string; label; required }],
  appliesTo: ("stay" | "stay_food" | "darshan")[], active, sortOrder }
```

**contacts** (reliable drivers and services, admin-only; optionally shown on the booking confirmation): `{ name, role: "cab" | "scooty" | "guide" | "other", phone, whatsapp?, notes, showToGuests: boolean, active }`

**discounts**
```ts
{ name, kind: "auto_offer" | "coupon", code? (unique, uppercase),
  type: "percent" | "flat", value: number, maxDiscount?: Paise,
  startsAt, endsAt, minAmount?: Paise, minNights?, verticals: ("stay" | "stay_food" | "darshan")[],
  propertyIds?: ObjectId[], tourIds?: ObjectId[], packageIds?: ObjectId[],
  usageLimit?, perCustomerLimit?, firstBookingOnly: boolean, usedCount: number,
  showStrikeThrough: boolean, badgeText?: "Save 18%",
  stackable: false, active: boolean }
```

**discountRedemptions**: `{ discountId, bookingId, customerId, amount: Paise, status: "reserved" | "used" | "released" }`. Created as `reserved` at checkout, set to `used` on payment, and `released` on expiry. `usedCount` is incremented atomically together with the limit check.

**cancellationPolicies**: `{ name, vertical, summary, rules: [{ daysBeforeMin: number; refundPercent: number }], nonRefundableItems: string[], body (rich text) }`

**customers**: `{ phone (E.164, unique), email?, name, city?, bookingsCount, totalSpent: Paise, firstBookingAt, lastBookingAt, tags: string[], marketingConsent: boolean, anonymizedAt? }`. The phone number is the primary key for identifying repeat guests.

**bookings**
```ts
{
  code: "VHI-2610-7K4Q" (unique), vertical: "stay" | "stay_food" | "darshan",
  customerId, guest: { name, phone, email, city? }, additionalGuests?: [{ name, age? }],
  items: [{                                  // array so multi-property bookings work later
    kind: "property" | "tour",
    propertyId?, tourId?, packageId?, departureId?,
    checkIn?: Date, checkOut?: Date, nights?: number, travelDate?: Date,
    adults: number, children: number, childAges: number[],
    mealPlanId?: ObjectId,
    assignedPropertyIds?: ObjectId[],        // tours with manual allocation
    channel?: { provider, externalReservationId?, syncStatus: "pending" | "synced" | "failed" | "not_required", lastError?, attempts: number }
  }],
  addOns: [{ addOnId, name, qty, unitPrice: Paise, details: Record<string,string> }],
  specialRequests?: string,
  pricing: {                                 // immutable snapshot
    lines: [{ type: "room" | "extra_guest" | "meal" | "tour" | "addon" | "discount", label, quantity, unitPrice: Paise,
              amount: Paise, gstVertical, gstRate: number, gstAmount: Paise, meta?: object }],
    subtotal: Paise, discountTotal: Paise, taxableAmount: Paise, gstTotal: Paise, total: Paise,
    amountDueNow: Paise, amountDueLater: Paise,  // supports partial advance later
    discount?: { discountId, code?, name, amount: Paise },
    currency: "INR", pricingVersion: string
  },
  status: "pending_payment" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "expired" | "failed",
  paymentStatus: "unpaid" | "pending" | "paid" | "partially_paid" | "failed" | "partially_refunded" | "refunded",
  payments: [{ provider: "razorpay" | "offline", orderId, paymentId?, method?, amount: Paise, status, paidAt?, raw? }],
  refunds: [{ refundId, amount: Paise, status: "pending" | "processed" | "failed", reason, initiatedBy, createdAt }],
  statusHistory: [{ from, to, at, by?: ObjectId, note? }],
  holdExpiresAt?: Date,
  source: "website" | "admin_manual" | "whatsapp" | "phone",
  attribution: { utm_source?, utm_medium?, utm_campaign?, utm_content?, utm_term?, fbclid?, gclid?, landingPage?, referrer?, firstTouchAt? },
  analyticsSessionId?, invoiceId?,
  cancellation?: { at, by, reason, policyApplied, refundAmount: Paise },
  internalNotes: [{ text, by, at }],
  isRepeatGuest: boolean
}
Indexes: code unique; { status: 1, createdAt: -1 }; { customerId: 1 }; { "items.propertyId": 1, "items.checkIn": 1 };
         { "items.tourId": 1, "items.travelDate": 1 }; { "payments.orderId": 1 }; { vertical: 1, createdAt: -1 }
```

**invoices**: `{ number: "VHI/26-27/000123" (unique, gapless per financial year via counters), bookingId, issuedAt, seller: {legalName, gstin, address}, buyer: {name, phone, email, gstin?, address?}, lines (from snapshot, with HSN/SAC codes), totals, pdf?: MediaRef }`

**enquiries**: `{ type: "tour" | "custom_tour" | "stay" | "general" | "advance_window", tourId?, propertyId?, name, phone, email?, travelDate?, people?, message, attribution, status: "new" | "contacted" | "converted" | "closed", assignedTo?, notes[], convertedBookingId? }`

**notifications** (outbox): `{ channel: "whatsapp" | "email", audience: "guest" | "admin", to, template, payload, bookingId?, status: "queued" | "sent" | "failed", attempts, lastError?, nextAttemptAt, providerMessageId? }`

**webhookEvents**: `{ provider, eventId, type, receivedAt, processedAt?, status }`, with a unique index on `{ provider, eventId }`.

**Content collections**
- `banners`: `{ placement: "home_hero" | "stays_top" | "tours_top", eyebrow, title, subtitle, media: MediaRef, mobileMedia?, cta: {label, href}, startsAt?, endsAt?, sortOrder, publishing }`
- `homeSections`: `{ key: "experience" | "offerings" | "featured_stays" | "experiences" | "reels" | "testimonials" | "faq" | "cta", enabled, sortOrder, content: Mixed (validated per key with Zod) }`
- `experiences`: `{ title, slug, description, image, category: "temple" | "ghat" | "food" | "parikrama" | …, publishing }`
- `testimonials`: `{ guestName, city?, image?: MediaRef, rating 1–5, text, vertical?, propertyId?, tourId?, stayMonth?, publishing, sortOrder }`
- `reels`: `{ title, label, instagramUrl, thumbnail: MediaRef, video?: MediaRef, active, sortOrder }`
- `faqs` (global): `{ question, answer, category: "general" | "stay" | "stay_food" | "darshan" | "payments", sortOrder, publishing }`
- `pages` (About, legal pages, future Braj guides): `{ slug, type: "static" | "guide" | "legal", title, blocks: Block[], seo, publishing }`
- `redirects`: `{ from, to, permanent: true }`
- `media` (library index): `{ publicId, url, resourceType, format, bytes, width, height, alt, caption, folder, usedIn: [{ collection, docId }], uploadedBy }`

**Admin and system collections**
- `adminUsers`: `{ name, email (unique), passwordHash, role: "owner" | "manager" | "staff" | "editor", totp?: { secret (encrypted), enabled }, active, lastLoginAt, failedLogins, lockedUntil? }`
- `auditLogs`: `{ adminId, action: "price.update" | "booking.cancel" | …, entity, entityId, before?, after?, ip, userAgent, at }`, with a TTL index after 2 years (configurable).
- `settings` (singleton): business details (legal name, GSTIN, addresses, phones, emails, WhatsApp numbers), GST rates per vertical plus slab rules, booking settings (holdMinutes, displayTaxInclusive default, advance days default), discount settings (allowStacking), notification settings (admin numbers, templates per event), integrations (enabled flags, non-secret IDs such as GA4 ID and Pixel ID), security (ownerRequire2FA), SEO defaults, social links.
- `counters`: `{ _id: "invoice_2026_27" | "booking", seq }`
- `rateLimits`: `{ key, count, expiresAt }`, with a TTL index.

**Analytics**
- `analyticsEvents`: `{ sessionId, type: "page_view" | "view_item" | "quote" | "begin_checkout" | "add_payment_info" | "purchase" | "enquiry", vertical?, itemId?, value?: Paise, attribution, device, at }`, with a TTL index after 400 days.
- `dailyStats` (rollup built by cron): `{ date, vertical?, propertyId?, tourId?, visitors, checkoutReached, bookings, revenue: Paise, nightsSold, guests }`

### 2.3 Transactions

Booking creation runs in a single Mongo transaction that covers: inventory locks, tour departure `$inc`, discount reservation, customer upsert, and the booking insert. Atlas replica sets support this. Payment confirmation runs in a second transaction.

---

## 3. API structure

Every response uses the shape `{ ok: true, data } | { ok: false, error: { code, message, fields? } }`.

### 3.1 Public API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/availability?propertyId&from&to` | Night-by-night availability for the calendar (cached) |
| GET | `/api/stays/search?checkIn&checkOut&guests&type&bedrooms&minPrice&maxPrice&amenities&collection` | Filtered listing with availability and "from" prices |
| POST | `/api/quote` | Body `{ vertical, ... }`. Returns the line breakdown and `quoteToken` |
| POST | `/api/discounts/validate` | Coupon check against the current quote |
| GET | `/api/tours/[slug]/departures?month=2026-11` | Dates with status (open, sold out, advance window) |
| POST | `/api/bookings` | Body `{ quoteToken, guest, addOns, specialRequests, attribution }`. Takes locks, creates the Razorpay order, returns `{ bookingCode, orderId, keyId, amount, holdExpiresAt }` |
| POST | `/api/bookings/[code]/verify` | Checkout handler: verifies signature and confirms (the webhook is the backup path) |
| POST | `/api/bookings/[code]/retry` | New Razorpay order if the hold is still valid or re-acquirable |
| GET | `/api/bookings/[code]?phone=` | Minimal confirmation view (OTP added later) |
| POST | `/api/enquiries` | Tour, custom tour, stay, or general enquiry |
| POST | `/api/track` | First-party funnel events (beacon) |
| POST | `/api/meta/capi` | Server-side Meta events (called internally on purchase or enquiry) |

### 3.2 Webhooks

| Path | Notes |
|---|---|
| `/api/webhooks/razorpay` | `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`. Raw-body HMAC verification, idempotent |
| `/api/webhooks/whatsapp` | Delivery and read status. GET verification challenge |
| `/api/webhooks/channel-manager` | For eZee push notifications, if they offer them (reservation from OTA → invalidate availability cache) |

### 3.3 Cron (Vercel Cron, protected by `CRON_SECRET`)

| Path | Schedule | Job |
|---|---|---|
| `/api/cron/expire-holds` | every 1 min | Mark `pending_payment` bookings past hold as `expired`, release discounts and tour capacity |
| `/api/cron/outbox` | every 1 min | Send queued WhatsApp and email, exponential backoff |
| `/api/cron/channel-sync` | every 2 min | Push unsynced reservations and cancellations to the channel manager, refresh the cache for the next 90 days |
| `/api/cron/reconcile-payments` | every 15 min | Fetch Razorpay status for stale `pending` payments |
| `/api/cron/analytics-rollup` | hourly | Build `dailyStats` |
| `/api/cron/cleanup` | daily | Prune past `booked` locks, anonymize expired PII |

### 3.4 Admin API (`/api/admin/*`, all wrapped in `withAdmin(permission)` plus audit logging)

```
auth/        login, logout, 2fa/setup, 2fa/verify
dashboard/   summary?from&to, funnel, charts
properties/  CRUD, [id]/publish, [id]/status, [id]/gallery (reorder), [id]/duplicate
pricing/     price-rules CRUD, calendar?propertyId&month (resolved rate grid), bulk-update
availability/ calendar?propertyId&month, blocks CRUD (manual provider), channel/health, channel/resync
meal-plans/  CRUD
packages/    CRUD, [id]/publish
tours/       CRUD, [id]/publish, [id]/departures CRUD, [id]/duplicate
bookings/    list (filters, search), [id], [id]/status, [id]/cancel, [id]/refund, [id]/assign-property,
             [id]/notes, [id]/resend-notification, [id]/invoice (PDF), manual (create offline booking), export.csv
enquiries/   list, [id], [id]/status, [id]/convert
customers/   list, [id], export.csv, [id]/anonymize
discounts/   CRUD, [id]/redemptions
add-ons/     CRUD;  contacts/ CRUD
content/     banners, home-sections, experiences, testimonials, reels, faqs, pages, redirects (CRUD + reorder + publish)
media/       sign-upload, register (after upload), list, [id] (alt/caption), delete (checks usedIn)
seo/         defaults, per-entity via entity endpoints, sitemap preview
users/       CRUD (owner only)
settings/    get, update (by section)
audit/       list
analytics/   export.csv
```

---

## 4. Admin architecture

### 4.1 Permission matrix

| Permission | Owner | Manager | Staff | Editor |
|---|:-:|:-:|:-:|:-:|
| dashboard.view (operational) | ✓ | ✓ | ✓ | – |
| analytics.revenue | ✓ | ✓ | – | – |
| properties.content | ✓ | ✓ | – | ✓ |
| properties.pricing / availability | ✓ | ✓ | – | – |
| packages / tours content | ✓ | ✓ | – | ✓ |
| packages / tours pricing | ✓ | ✓ | – | – |
| bookings.view / guest info | ✓ | ✓ | ✓ | – |
| bookings.status (check-in/out) | ✓ | ✓ | ✓ | – |
| bookings.cancel / refund | ✓ | ✓ | – | – |
| bookings.manual_create | ✓ | ✓ | ✓ | – |
| discounts | ✓ | ✓ | – | – |
| content (banners, reels, FAQs, testimonials, pages) | ✓ | ✓ | – | ✓ |
| media | ✓ | ✓ | – | ✓ |
| exports (customer data) | ✓ | – | – | – |
| users, settings, audit | ✓ | – | – | – |

Permissions are defined in `src/server/auth/permissions.ts` as a single map. Both the UI and `withAdmin` read from it.

### 4.2 Admin UI structure

- A sidebar grouped by work area:
  - **Overview:** Dashboard, Bookings, Enquiries, Calendar
  - **Catalogue:** Stays, Stay + Food, Darshan Tours, Meal Plans, Add-ons
  - **Revenue:** Pricing, Offers & Coupons
  - **Content:** Home, Banners, Experiences, Testimonials, Reels, FAQs, Pages, Media
  - **Admin:** Customers, Analytics, SEO, Users, Settings, Audit log
- **Calendar** is the operational heart: a month grid per property showing bookings, holds, blocks, maintenance, and the resolved nightly rate. Clicking a cell opens a price override or block.
- **Entity editors** are tabbed (Details · Media · Pricing · Rules · SEO · FAQs), with a sticky footer containing Save draft / Preview / Publish, and an unsaved-changes guard.
- **Itinerary builder:** a drag-to-reorder day list with items, an optional image per day, and a live preview.
- **Media picker:** Cloudinary signed direct upload from the browser, drag reordering, and inline alt-text editing. Alt text is required before publishing.
- **Bookings list:** saved filters (Today's arrivals, Pending payment, Channel sync failed), a status timeline in the detail drawer, and one-click resend of WhatsApp messages.
- **Tech:** react-hook-form + Zod (schemas shared with the API), TanStack Table, Recharts, a Tiptap rich-text editor limited to paragraphs, lists, links, and bold/italic.
- **Admin design:** the same brand tokens in a quieter density. Ivory and paper surfaces, charcoal for primary actions, brass for focus and selection, no template dashboard look.

### 4.3 Dashboard metrics

| Metric | Source |
|---|---|
| Visitors, sessions, traffic sources | GA4 (embedded link or Data API later) + first-party `page_view` count |
| Checkout reached, bookings, conversion rate | `analyticsEvents` → `dailyStats` |
| Bookings by nights, by guest count, repeat vs new, by value band | `bookings` aggregations |
| Vertical split (Stay / Stay + Food / Darshan) | `bookings.vertical` |
| Property-wise bookings, nights sold, revenue, occupancy % | `bookings.items` + calendar |
| Average nightly rate (ADR), revenue, MoM growth | `bookings.pricing` (room lines ÷ nights) |
| Campaign performance | `bookings.attribution` grouped by utm_campaign |

All widgets take a date range with a comparison period and support CSV export.

---

## 5. Booking flows

### 5.1 Stay (5 steps, with guest-visible progress)

1. **Dates + guests:** on the listing or detail page. The calendar shows unavailable nights and minimum-stay hints.
2. **Property:** selected from the listing, or already chosen on the detail page. The booking card shows a live quote.
3. **Enhance:** meal plan (shown when `nights >= 3`; otherwise a hint that meals unlock at 3 nights) and add-ons with their detail fields.
4. **Guest details:** name, phone (with a WhatsApp checkbox, on by default), email, special requests, optional GST details for invoicing, coupon field, and a price summary with a GST breakdown and cancellation summary.
5. **Pay:** a hold is created with a visible countdown, then Razorpay Checkout opens. The confirmation page shows the booking code, itinerary or next steps, WhatsApp and email sent, and an "add to calendar" option.

### 5.2 Stay + Food

Package page → choose property from the eligible list, plus check-in date (nights fixed by the package) → meal option → guest details → pay. This reuses the stay components with `vertical: stay_food`.

### 5.3 Darshan

1. **Tour:** detail page with a sticky booking card.
2. **Date + people:** dates inside the advance window are shown disabled with the WhatsApp message. The adult/child counter enforces the minimum group (4), and the price updates live per person.
3. **Guest details + add-ons:** includes pickup point and arrival details.
4. **Pay.**
5. **Confirmation.**

`bookingMode` controls the booking card: `online` shows only Book Now; `enquiry` replaces the card with an enquiry form plus WhatsApp; `both` shows Book Now with "Prefer to talk first? WhatsApp us" underneath. A Custom Tour enquiry is available on the listing page and in the footer CTA.

### 5.4 State machine

```
pending_payment ──paid──▶ confirmed ──▶ checked_in ──▶ checked_out
      │  │                    │
      │  └─hold expired──▶ expired
      └─payment failed──▶ (stays pending until expiry; retry allowed) ──▶ failed (explicit)
confirmed ──cancel──▶ cancelled (paymentStatus → refunded / partially_refunded / paid if non-refundable)
```

**On confirmation**, in a single transaction:
- locks change from hold → booked
- the discount is marked used
- the customer's stats are updated
- invoice number is assigned
- outbox rows are created for guest WhatsApp, guest email, and admin WhatsApp to each configured number
- a channel-manager push is queued
- a Meta CAPI Purchase event is queued

### 5.5 Admin WhatsApp alert template (variables)

`booking_code, vertical, guest_name, phone, item_name, check_in / travel_date, check_out, nights, guests (A adults, C children), meal_plan, add_ons, discount, gst_total, total, payment_status, special_requests, admin_link`

WhatsApp templates must be pre-approved by Meta. Submit them in Phase 1.

---

## 6. UI/UX structure

### 6.1 Design direction

Editorial hospitality magazine meets Braj. Calm, spacious, photograph-led. Decoration comes from typography, proportion, and a few restrained motifs (a thin gold rule, a small lotus or peacock-feather glyph used sparingly), never from gradients or ornament overload.

### 6.2 Brand system (derived from the official VHI logo)

The logo is a heavy black "VHI" wordmark on an ivory ground, with "Luxury Homestays" set in a light monospaced face. The palette takes the ivory and black directly and adds warm beige/taupe, with brass used only as a fine accent. There is no green in the palette.

| Token | Value | Use |
|---|---|---|
| `--color-ivory` | `#F2EFE8` | Page background (sampled from the logo) |
| `--color-paper` | `#F8F6F1` | Raised surfaces, booking card |
| `--color-linen` | `#E8E2D7` | Alternate section bands |
| `--color-sand` | `#D6CCBC` | Input outlines, dividers on light |
| `--color-taupe` | `#9D8F7B` | Icons, secondary accents |
| `--color-umber` | `#5C5245` | Italic accent words, eyebrows |
| `--color-charcoal` | `#1D1C1A` | Body text, dark sections, primary buttons |
| `--color-ink` | `#0E0D0C` | Headlines (the logo black) |
| `--color-muted` | `#6F685E` | Secondary text (AA on ivory) |
| `--color-brass` | `#A4834E` | Hairlines, focus rings, active states — never large fills |

- **Type:** display serif **Instrument Serif** (regular + italic, italic for accent phrases such as "Your *Braj yatra*"); UI/body sans **Manrope**; labels, eyebrows and small meta in **DM Mono** uppercase with wide tracking, echoing the logo's monospaced tagline. The logo itself is used as an image/SVG, never re-set in a font. Devanagari (later): **Tiro Devanagari Hindi** + **Mukta**. Fluid scale: display 48–100px, headline 36–64px, body 16px at 1.65 line height, line length about 65ch.
- **Dark sections** (hero overlays, trust band, final CTA, footer) use charcoal/ink with ivory text instead of the forest green of v1.0.
- **Shape:** radius 2px on inputs, 4px on cards and images. Borders are rare; separation comes from whitespace, section bands and a thin brass-to-line hairline. Soft shadows only on floating elements (booking card, sticky bar).
- **Ask the client for the logo as SVG** (and a light-on-dark version). The supplied file is a 150px JPG, which is too small for the header or print.
- **Grid:** 12 columns, 1280px max content width, generous section padding (96–160px desktop, 64–88px mobile).
- **Motion:** the `motion` library, restricted to image fade/scale-in on reveal, underline hover on links, image zoom of 1.03 on card hover, and smooth accordion and drawer transitions. Animations last 200–500ms, respect `prefers-reduced-motion`, and never animate layout on scroll-jank-prone elements.
- **Imagery:** real property photography, 3:2 and 4:5 crops, with Cloudinary `g_auto` smart cropping.
- **Accessibility:** WCAG AA contrast, visible focus rings in gold, full keyboard support in the calendar and steppers.

### 6.3 Global elements

- **Header:** transparent over the hero, turning ivory on scroll. Nav: Stays · Stay + Food · Darshan Tours · Experiences · About · Contact, with a "Plan your yatra" button.
- **Contact:** a floating contact pill (WhatsApp + Call) on desktop. On mobile it merges into a sticky bottom bar on detail pages, which also shows the price and the Book button.
- **Footer:** ink background with ivory text with offerings, popular tours, Braj guides (later), company links, contact, legal, and social.

### 6.4 Page structures

**Home**
1. Full-bleed hero slider (banners): headline selling Vrindavan, with a compact search (Stay dates / Darshan tour tabs).
2. "Vrindavan, as it's meant to be experienced": an editorial intro with an asymmetric image pair.
3. The three offerings as large editorial panels (STAY / STAY + SATTVIK FOOD / DARSHAN TOURS), each with one line of copy, a "from" price, and a link.
4. Featured stays: horizontal scroll on mobile, 3-up on desktop.
5. Vrindavan experiences: a mosaic of temples, ghats, food, and parikrama.
6. Darshan tours strip: three durations with per-person prices.
7. Instagram reels slider.
8. Testimonials: large quote, one at a time.
9. FAQs.
10. Final CTA on a charcoal band with WhatsApp and Call.

**Stays listing:** a slim search bar, a filter row (type, guests, bedrooms, price, amenities, collection) that becomes a bottom sheet on mobile, a tax-inclusive toggle, and editorial property cards (image carousel, name, area, guests, beds, baths, key amenities, "from ₹X / night", strike-through when an offer applies).

**Stay detail:**
- Gallery: 1 large + 4 grid tiles, opening a full-screen lightbox.
- Header block: title, area, guests · bedrooms · beds · baths.
- Highlights row.
- Description with a "read more" option.
- Where you'll sleep (a card per bedroom), amenities (grouped, with "show all"), and meal plans offered (unlocks at 3 nights).
- Availability calendar (two months).
- Location (approximate map + nearby temples with walking times), house rules, check-in/out times, cancellation policy, reviews/testimonials, FAQs, and similar stays.
- A sticky booking card on the right; on mobile, a sticky bottom bar.

**Stay + Food:** listing of the 3/5/7-night packages. Each detail page has a hero, what's included, meal options, day-by-day itinerary (plus a PDF download), eligible stays to choose from, local recommendations, booking card, and FAQs.

**Darshan tour detail** (conversion-first, following the reference order):
1. Hero on a dark image with eyebrow, title, subtitle, price per person, and "Book now" / "WhatsApp us"; the booking card is visible above the fold on desktop and sticky thereafter.
2. Duration and trust strip (group size, pickup, rating, happy families).
3. Day-by-day itinerary (a timeline with day markers).
4. Included / Not included (two columns).
5. Travel info from the start city (text + fact card with distance, drive time, route).
6. Pickup and drop points.
7. Stay information.
8. Meals.
9. Trust band.
10. Booking or enquiry form.
11. FAQs (accordion).
12. Related Braj journeys.
13. Final CTA ("Plan your Braj yatra with people who live here" style).
14. Footer.

Mobile uses a sticky bottom bar showing "₹5,999/person · Book now".

**Checkout:** a single page with a step header, the form in the left column, and a sticky summary on the right. On mobile, the summary is collapsible. The hold countdown is shown subtly.

**About, Contact, and legal pages:** built from `pages` blocks. Contact has a form, WhatsApp, call, email, and an approximate map.

### 6.5 SEO

- Routes: `/stays`, `/stays/[slug]`, `/stay-food`, `/stay-food/[slug]`, `/darshan-tours`, `/darshan-tours/[slug]`, `/experiences/[slug]` (later), `/guides/[slug]` (later), `/about`, `/contact`, `/policies/[slug]`.
- `generateMetadata` reads from each entity's `seo` field, with fallbacks from settings.
- JSON-LD: `LodgingBusiness` / `VacationRental` for stays, `TouristTrip` + `Offer` for tours, `FAQPage`, `BreadcrumbList`, `Organization` + `LocalBusiness`.
- A dynamic `sitemap.xml` of published content only, plus `robots.txt`. Staging is set to noindex.
- The `redirects` collection is applied in middleware for 301s.
- City landing pages are only created manually through admin with unique content. They are never auto-generated.
- Core Web Vitals targets: LCP < 2.5s on mobile 4G, CLS < 0.1. Achieved through Cloudinary responsive images with a priority hero, `next/font` self-hosted fonts, and minimal client JavaScript.

---

## 7. Folder structure

```
vhi/
├─ src/
│  ├─ app/
│  │  ├─ (site)/
│  │  │  ├─ layout.tsx, page.tsx                     # home
│  │  │  ├─ stays/page.tsx, stays/[slug]/page.tsx
│  │  │  ├─ stay-food/page.tsx, stay-food/[slug]/page.tsx
│  │  │  ├─ darshan-tours/page.tsx, darshan-tours/[slug]/page.tsx
│  │  │  ├─ checkout/[code]/page.tsx, booking/[code]/page.tsx
│  │  │  ├─ about/, contact/, policies/[slug]/, experiences/[slug]/
│  │  ├─ (admin)/admin/
│  │  │  ├─ layout.tsx, login/, page.tsx (dashboard)
│  │  │  ├─ bookings/, enquiries/, calendar/, stays/, stay-food/, tours/, meal-plans/, add-ons/,
│  │  │  ├─ pricing/, discounts/, content/{banners,home,experiences,testimonials,reels,faqs,pages}/,
│  │  │  ├─ media/, customers/, analytics/, seo/, users/, settings/, audit/
│  │  ├─ api/ (public, webhooks, cron, admin — as section 3)
│  │  ├─ sitemap.ts, robots.ts, not-found.tsx, error.tsx
│  ├─ components/
│  │  ├─ ui/            # primitives: Button, Input, Select, Dialog, Sheet, Accordion, Calendar, Stepper
│  │  ├─ site/          # Header, Footer, Hero, OfferingPanels, PropertyCard, Gallery, BookingCard, Itinerary, …
│  │  ├─ booking/       # checkout steps, summary, hold timer, Razorpay button
│  │  └─ admin/         # AdminShell, DataTable, EntityEditor, MediaPicker, ItineraryBuilder, RateCalendar, charts
│  ├─ server/
│  │  ├─ db/            # connection (cached), transaction helper
│  │  ├─ models/        # one file per collection
│  │  ├─ services/      # pricing, availability, booking, payment, discount, invoice, notification, analytics, content, customer
│  │  ├─ providers/
│  │  │  ├─ channel-manager/  (types.ts, manual.ts, ezee.ts, index.ts)
│  │  │  ├─ payment/razorpay.ts
│  │  │  ├─ whatsapp/ (types.ts, meta-cloud.ts, interakt.ts, console.ts, index.ts)
│  │  │  ├─ email/ (resend.ts, ses.ts, console.ts)
│  │  │  └─ media/cloudinary.ts
│  │  ├─ auth/          # auth config, permissions.ts, withAdmin.ts, totp.ts
│  │  ├─ jobs/          # cron job implementations
│  │  ├─ audit.ts, rate-limit.ts, errors.ts
│  ├─ lib/
│  │  ├─ money.ts (paise helpers, formatINR), dates.ts (IST-safe), slug.ts, cloudinary-loader.ts, localized.ts
│  │  ├─ validation/    # Zod schemas shared by forms and API
│  │  └─ analytics/     # gtag, pixel, track() client helpers
│  ├─ emails/           # React Email templates
│  ├─ styles/globals.css (Tailwind @theme tokens)
│  └─ middleware.ts     # admin gate, redirects, UTM capture cookie
├─ scripts/seed.ts      # 10 properties, meal plans, 3 packages, 3 tours, settings
├─ tests/ (unit: pricing/discount/availability; e2e: Playwright booking flows)
├─ .env.example
└─ README.md
```

---

## 8. Development phases

The phases are ordered so Darshan Tours can go live first for Meta ads. Estimates assume one senior full-stack developer plus a designer for Phase 0.

| Phase | Scope | Est. |
|---|---|---|
| **0. Foundation** | Repo, environments (dev/staging/prod), Atlas, Cloudinary, CI, design tokens and UI primitives, Mongoose connection, admin auth + RBAC + audit, settings, media library, seed script. Submit WhatsApp templates. Request eZee API access. | 1.5 wks |
| **1. Darshan launch** | Tours CMS + itinerary builder, departures, tour listing and detail pages, pricing engine (tour path), booking + Razorpay + webhooks + holds on capacity, enquiries (including advance-window and custom), WhatsApp and email outbox, confirmation page, GA4 + Meta Pixel + CAPI + UTM capture, admin bookings and enquiries, legal pages. **→ Go live for Meta ads.** | 3–3.5 wks |
| **2. Stays** | Properties CMS, amenities, price rules, rate calendar, ManualAvailabilityProvider + inventory locks, stays search/listing/detail, meal plans, add-ons, discounts and coupons, stay checkout. | 3.5 wks |
| **3. Stay + Food + Home** | Packages + itinerary PDFs, home page and all content modules (banners, experiences, reels, testimonials, FAQs), About and Contact, SEO (metadata, JSON-LD, sitemap, redirects). | 2 wks |
| **4. eZee integration** | EzeeChannelManagerProvider, property mapping UI, availability sync + cache, reservation push/cancel, reconciliation, failure alerts. Tour-linked property inventory. *Blocked on credentials and documentation.* | 2–3 wks |
| **5. Operations & analytics** | Dashboard metrics and charts, exports, GST invoices (PDF), admin-initiated refunds + cancellation policy engine, check-in/out workflow, 2FA, PII anonymization. | 2 wks |
| **6. Hardening & launch** | Playwright e2e on staging with Razorpay test mode, load test on the booking endpoint, security review, CWV tuning, backups verified, content entry support, production cutover. | 1.5 wks |

**Total: roughly 16–17 weeks.** Darshan can be live around week 5.

**Definition of done for each phase:** pricing and discount unit tests pass, the e2e happy path and failure paths pass on staging, admin actions appear in the audit log, and there is no hard-coded client-controllable value.

---

## 9. Items still pending from the client

Resolved since v1.0: logo received (brand system in 6.2), Darshan prices, minimum group and advance rule confirmed, meal eligibility made configurable, cancellation policy and GST fully admin-configurable, all integrations built behind providers so development continues without credentials.


1. Legal name, GSTIN, registered and invoice addresses, SAC codes, and GST rates confirmed by their CA.
2. Logo as SVG (plus a light version) and property photography.
3. The meaning of "ATT" (Braj Casa) — stored as an editable label meanwhile.
4. eZee product, hotel code(s), property/room-type mapping, API documentation and credentials, and whether eZee is the rate master.
5. Razorpay keys (test and live) and webhook secret.
6. WhatsApp provider or Meta Business account, sender number, and admin alert numbers.
7. Email sender domain (for SPF/DKIM).
8. Cancellation and refund policy wording for each vertical.
9. Meal plan prices (adult and child) and the child age band.
10. Darshan: pickup points, vehicles, maximum group size, which VHI properties are used, and whether allocation is auto or manual.
11. Whether an existing website needs migration (for redirects), and the Google Business Profile.
12. Launch target date for Phase 1 (Meta ads).
