# VHI · Vrindavan Holiday Inn — Luxury Homestays

Booking website + admin panel for VHI: private homestays, **Stay + Sattvik Food** packages and **Darshan Tours** in Vrindavan.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · MongoDB Atlas + Mongoose · Cloudinary · Razorpay · eZee channel-manager adapter · WhatsApp (Meta Cloud / Interakt) · Email (Resend) · GA4 + Meta Pixel + Conversions API · Recharts · Zod · Lucide.

---

## 1. Installation

Requirements: **Node.js 20.9+** and a MongoDB Atlas cluster.

```bash
npm install
cp .env.example .env.local      # then fill it in (section 2)
npm run seed                    # 10 properties, 3 Darshan tours, meal plans, add-ons, FAQs, first admin
npm run dev                     # http://localhost:3000  ·  admin: http://localhost:3000/admin
```

Development commands:

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm test` | Pricing & refund engine unit tests |
| `npm run seed` | Seed / refresh the initial catalogue (idempotent) |
| `npm run create-admin` | Create or reset an owner login from `SEED_ADMIN_*` |
| `npm run db:indexes` | Sync MongoDB indexes (run after schema changes in production) |

## 2. Environment setup (`.env.local`)

Every integration is optional in development — the app falls back to safe providers:

| Area | Without credentials | Switch on with |
|---|---|---|
| Payments | `PAYMENT_PROVIDER=mock` — a “simulate success / fail” dialog | `PAYMENT_PROVIDER=razorpay` + Razorpay keys |
| Availability | `CHANNEL_MANAGER_PROVIDER=manual` — admin blocks + website bookings | `CHANNEL_MANAGER_PROVIDER=ezee` + eZee credentials |
| WhatsApp | `WHATSAPP_PROVIDER=console` — messages printed in the terminal | `meta_cloud` or `interakt` |
| Email | `EMAIL_PROVIDER=console` | `resend` + `EMAIL_API_KEY` |
| Media | Paste-URL fallback in the media library | Cloudinary keys |

Minimum to run locally: `MONGODB_URI`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (10+ characters).
Generate secrets with `openssl rand -hex 32` (`CRON_SECRET`).
**Never commit `.env.local`.** Mock payments are refused when `APP_ENV=production`.

## 3. MongoDB setup

1. Create a cluster on **MongoDB Atlas** (region **Mumbai / ap-south-1**). The M0 free tier is fine for development; use M10+ for production.
2. Database Access → add a user with read/write on the `vhi` database.
3. Network Access → allow your IP (and `0.0.0.0/0` for Vercel, or use Atlas’ Vercel integration).
4. Copy the connection string into `MONGODB_URI`, set `MONGODB_DB=vhi`.

> Bookings use **multi-document transactions**, which need a replica set. Atlas always provides one. A plain local `mongod` will not work — use Atlas, or run a local single-node replica set (`mongod --replSet rs0` then `rs.initiate()`).

Use separate databases (or clusters) for development, staging and production.

## 4. Cloudinary setup

1. Create a Cloudinary account → Dashboard → copy **Cloud name, API key, API secret** into `CLOUDINARY_*`.
2. Optional: `CLOUDINARY_FOLDER` (default `vhi`). Files go to `vhi/<APP_ENV>/<folder>`.
3. Uploads are **signed** and go straight from the browser to Cloudinary; the API secret never leaves the server. Images are delivered with `f_auto,q_auto` responsive transforms.

Admin → **Media Library** handles images, videos (reels, banner videos) and PDFs (itineraries), with title, alt text and folder. Every image field in admin opens the same library.

## 5. Razorpay setup

1. Razorpay Dashboard → Settings → API Keys → generate **test** keys → `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`; set `PAYMENT_PROVIDER=razorpay`.
2. Settings → **Webhooks** → add `https://<your-domain>/api/webhooks/razorpay` with a secret (→ `RAZORPAY_WEBHOOK_SECRET`). Events: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`.
3. Switch to **live** keys only after the client’s KYC is approved and a test booking has been refunded end-to-end.

How payments work: the server re-computes the price, creates the booking as `pending_payment` with a hold, creates a Razorpay order, and records every transaction in the `payments` collection. Confirmation happens through the checkout signature **and** the webhook (idempotent); a 15-minute cron reconciles anything missed. Refunds are issued from Admin → Booking → Cancel. If a payment lands after the dates were taken, the system refunds automatically and alerts the team.

## 6. eZee channel manager

The booking engine only talks to the `ChannelManagerProvider` interface (`src/lib/integrations/channel-manager/types.ts`).

```
src/lib/integrations/ezee/
  config.ts                 endpoints & credentials (endpoint paths are TODO placeholders)
  client.ts                 signed HTTP client, timeouts, error handling
  availability.service.ts   fetch + map availability
  rates.service.ts          fetch + map rates (for properties set to “rates from channel manager”)
  reservation.service.ts    push confirmed website bookings
  cancellation.service.ts   cancel reservations
  ezee.adapter.ts           implements ChannelManagerProvider
```

**Until credentials arrive:** keep `CHANNEL_MANAGER_PROVIDER=manual`. Availability = admin **Availability Blocks** + confirmed website bookings. ⚠️ Mirror every Airbnb/OTA booking as a block, or double bookings are possible.

**Going live with eZee:** get API docs, hotel code and room-type/rate-plan IDs from eZee → fill `EZEE_*` → fill the endpoint paths and response mapping in `ezee/*.service.ts` → enter each property’s eZee IDs in Admin → Properties → *Availability & channel* → set `CHANNEL_MANAGER_PROVIDER=ezee`. Settings → Integrations shows the health check. Confirmed bookings sync every 2 minutes; after 5 failed attempts the team is alerted on WhatsApp/email.

## 7. WhatsApp setup

Choose a provider in `WHATSAPP_PROVIDER`:

- **meta_cloud** — Meta WhatsApp Cloud API: `WHATSAPP_ACCESS_TOKEN` (permanent system-user token), `WHATSAPP_PHONE_NUMBER_ID`. Optional delivery webhook: `https://<domain>/api/webhooks/whatsapp` with `WHATSAPP_WEBHOOK_VERIFY_TOKEN` and `WHATSAPP_APP_SECRET`.
- **interakt** — put the Interakt API key in `WHATSAPP_ACCESS_TOKEN`.

Create and get approval for these **templates** (names are editable in Admin → Settings → Notifications). Variables must be in this order:

| Template | Variables |
|---|---|
| `vhi_admin_new_booking` | {{1}} booking ID · {{2}} guest name · {{3}} phone · {{4}} offering: property/tour · {{5}} dates · {{6}} nights · {{7}} guests · {{8}} meal plan · {{9}} add-ons · {{10}} discount · {{11}} GST · {{12}} total · {{13}} payment status · {{14}} special requests |
| `vhi_booking_confirmed` (guest) | {{1}} name · {{2}} booking ID · {{3}} property/tour · {{4}} dates · {{5}} guests · {{6}} total · {{7}} booking link |
| `vhi_admin_new_enquiry` | {{1}} subject · {{2}} name · {{3}} phone · {{4}} date · {{5}} people · {{6}} message |
| `vhi_booking_cancelled` (guest) | {{1}} name · {{2}} booking ID · {{3}} refund amount |

Add VHI’s receiving numbers (E.164, e.g. `+919876543210`) in **Admin → Settings → Notifications**. All messages go through an outbox with automatic retries (Admin → Notifications).

## 8. Email setup

Set `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY`, and `EMAIL_FROM` using a domain you have verified in Resend (add its SPF/DKIM DNS records). Emails sent: booking confirmation, a separate payment receipt (amount, payment ID, method, invoice number), cancellation/refund, and admin new-booking and enquiry alerts. Admin recipients are set in Settings.

## 9. Admin login

`npm run seed` creates the first **owner** from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. Reset or add an owner any time with `npm run create-admin`. Sign in at **/admin/login**; add staff in **Users & Roles**.

| Role | Access |
|---|---|
| Owner | Everything, incl. users, settings, audit log |
| Manager | Bookings, refunds, pricing, offers, catalogue, content, analytics |
| Staff | Bookings (no refunds), enquiries, customers |
| Editor | Catalogue content, content pages, media |

Security: scrypt password hashing, httpOnly revocable DB sessions (12 h), login lockout after 5 failures, RBAC enforced on every admin API, rate limiting on public APIs, Zod validation (unknown fields are dropped), webhook signature verification, audit log of admin changes, security headers, and admin pages set to `noindex`.

### Do guests need to log in?

No. Guests book without an account (guest checkout): they enter name, mobile and optional email in the booking form, pay, and receive their booking ID and a private booking link on WhatsApp and email. The mobile number is used to recognise repeat guests. Only VHI staff log in, at `/admin/login`.

### Forgotten admin password

An owner can set a new password for any user in **Users & Roles**. If the owner is locked out, run `npm run create-admin` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` set — it resets that account’s password and unlocks it.

## 10. Admin modules

Dashboard · Bookings (filters, CSV export, detail, check-in/out, cancel + refund, notes, resend, printable invoice) · Analytics (7/30/90/365 days) · Properties · Darshan Tours · Stay + Food Packages · Itineraries (with PDF) · Amenities · Add-ons · Meal Plans · Seasonal Pricing · Availability Blocks · Tour Departures · Offers · Coupons · Cancellation Policies · Banners · Vrindavan Experiences · Testimonials · FAQs · Instagram Reels · Pages · Enquiries · Customers · Media Library · Notifications · Users & Roles · Settings · Audit log.

Quick actions: **Publish / Unpublish** on every list with a visibility field, and **Maintenance / Reopen** on properties — one click, validated and audit-logged like a normal edit. The Media Library shows where each file is used (property, tour, banner, …), filters by usage (including “not used anywhere”), and warns before deleting a file that is in use.

Business rules are all data, editable in admin: meal-plan eligibility (default “3 nights or more”, per meal plan), Darshan minimum group (4) and advance booking (15 days) per tour, hold minutes, GST rates, WhatsApp recipients, prices, weekend/seasonal pricing, offers and coupons.

## 11. Production deployment (Vercel)

1. Push to GitHub → import in Vercel (framework: Next.js). **Vercel Pro** is required for the per-minute crons in `vercel.json`.
2. Add all environment variables for Production (and Preview → staging database). Set `APP_ENV=production`, `NEXT_PUBLIC_APP_URL=https://yourdomain`, `CRON_SECRET`.
3. Deploy, then run once against production: `npm run db:indexes`, `npm run seed` (creates drafts with ₹0 rates outside development) and complete content in admin.
4. Point the domain, then register the Razorpay (and WhatsApp) webhooks with the production URL.
5. Crons (secured by `CRON_SECRET`): `expire-holds` and `outbox` every minute, `channel-sync` every 2 minutes, `reconcile-payments` every 15 minutes.

Other hosts: run `npm run build && npm start` and call `GET /api/cron/<job>` with `Authorization: Bearer $CRON_SECRET` on the same schedule.

## 12. Database seed

`npm run seed` is idempotent and creates: settings, the first owner, 18 amenities, meal plans (Breakfast, Breakfast + Dinner), 4 add-ons (Pick & Drop, Scooty, Cab, Special), 3 cancellation policies (**placeholders**), the 10 properties, three 3/5/7-night Stay + Food packages with itineraries, the 3 Darshan tours at ₹5,999 / ₹8,999 / ₹11,999 per person, 8 Vrindavan experiences, FAQs and draft About/Privacy/Terms pages.

In **development** properties get sample nightly rates and everything is published. Elsewhere, rates are ₹0 and content is created as **draft**. No real credentials are in the seed.

## 13. Before go-live checklist

- Real nightly rates, meal prices, GST rates (confirm with the CA), and cancellation policy tiers.
- Photos for every property, tour, package and the homepage (Cloudinary).
- Legal review of Privacy/Terms; business details, GSTIN and invoice address in Settings.
- Meaning of the “ATT” label on Braj Casa (edit or remove in admin).
- Razorpay live keys + webhook; WhatsApp templates approved; email domain verified.
- eZee connected — or every OTA booking mirrored as an availability block.

## Project structure

```
src/
  app/(site)/…          public pages (home, stays, stay-food, darshan-tours, checkout, booking, legal)
  app/admin/…           admin panel (login, dashboard, generic module CRUD, bookings, media, …)
  app/api/…             public, admin, webhook and cron routes
  admin/                admin module & field configuration (drives lists, forms and validation)
  components/           site, booking, admin and analytics components
  lib/                  money (integer paise), dates (IST), media, SEO, env, utilities
  lib/integrations/     razorpay, ezee, channel-manager, whatsapp, email, cloudinary, meta
  server/               db, models, auth/RBAC, services (pricing, booking, availability, …)
scripts/                seed, create-admin, sync-indexes
tests/unit/             pricing engine tests
docs/                   technical specification, client brief, references
```

Money is stored as **integer paise**, dates as IST `YYYY-MM-DD` strings, and every booking keeps a full price snapshot. See `docs/SPEC.md` for the full design.
#   v r i n d a v a n _ b n b  
 #   v r i n d a v a n _ b n b  
 