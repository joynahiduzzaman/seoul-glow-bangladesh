# Seoul Glow Bangladesh

Authentic Korean skincare e-commerce platform — Next.js 14 (App Router) + TypeScript + Prisma + Tailwind CSS.

This is a real, working full-stack application: every page is connected to a live database, not a mockup.

> **Latest update — Auth bug fixed + Account Dashboard completed**:
> - **Root cause of "profile icon logs you out"**: `Header.tsx` checked login status once on mount, but never remounts during client-side navigation — so after logging in via `router.push()`, the header kept believing you were a guest and sent the profile icon back to `/login`. Fixed by re-checking auth status on every route change.
> - **Account Dashboard completed**: added the sections that were missing — Saved Addresses (full CRUD), Coupons (browse active codes), Notifications (real triggers on order placed / order status changed, not decorative), and Support Tickets (two-sided: customers open/reply, staff respond and manage status from a new `/admin/support-tickets`). Settings added with email preferences and account deletion (password-confirmed, preserves order history for business records via `onDelete: SetNull`, cascades personal data).
> - **⚠️ Schema changed** — three new models (`Notification`, `SupportTicket`, `TicketReply`) and one new field (`User.marketingOptIn`). After pulling this version, run `npx prisma generate && npx prisma db push` again (and re-seed if you want the new demo data) before starting the dev server, or you'll see "table does not exist" errors.

> **THE actual root cause, found and fixed**: the Content-Security-Policy header (added for hardening in `next.config.mjs`) didn't include `'unsafe-eval'`. Next.js **dev mode** (`npm run dev`) uses `eval()`-wrapped modules for Hot Module Replacement — without `unsafe-eval`, the browser silently blocked that, meaning **zero client-side JavaScript executed on any page**. That's why login, search, Add to Cart, and the language switcher *all* did nothing: every single one of them is a click handler that needs JS to run, and none of it was running, while the page still looked fully rendered because that part is plain server-rendered HTML. Fixed by only relaxing the CSP with `unsafe-eval` in development — production builds (which don't use eval) keep the strict policy. **This should resolve everything reported as "not working" up to this point.**
>
> **Also in this build**:
> - **Hero rebuilt again**, this time to a premium cinematic standard: full-viewport-height rotating background photography with a slow Ken Burns zoom, animated stat counters (count up on load), real trust indicators, and floating product cards showing actual bestseller data (name/price/rating pulled from the database, never placeholder numbers). `framer-motion` is back and safe to use now that the CSP `unsafe-eval` bug above is fixed — but by design, the headline/copy/CTA buttons are never gated behind motion succeeding (see the comment at the top of `Hero.tsx`); only supplementary elements (background crossfade, particles, floating cards) depend on it.
> - **Frontend/backend code reorganized** — backend-only modules (database client, auth/JWT, email, payment gateways, rate limiting) moved to a new `src/server/` folder, never imported by anything the browser runs. See §16 for the full map of what to edit where.
> - **Product card images** made smaller/inset for a more premium boutique look.
>
> Earlier fixes, kept for reference:
> 1. **Corrupted cart data** could break `Header.tsx` (rendered on every page) if `localStorage` ever held an unexpected shape — `cart-store.ts` now sanitizes persisted data on every read.
> 2. **Blank hero/product sections** from framer-motion animations gated behind JS — removed in favor of always-visible content with CSS-only transitions.
> 3. **Login not persisting** — the cookie's `Secure` flag now reflects the actual request protocol instead of `NODE_ENV`.
> 4. **CSRF false positives behind proxies** — origin-check now checks `X-Forwarded-Host` first.
> 5. A hydration-mismatch bug in `ReferralDashboard.tsx` was fixed.
> 6. `error.tsx` / `global-error.tsx` added so future errors show a recoverable screen instead of silence.
>
> **After pulling this version**: clear your browser's localStorage for this site (DevTools → Application → Local Storage → delete `seoul-glow-cart`) and do a clean reinstall:
> ```
> rm -rf node_modules .next
> npm install
> npm run dev
> ```

---

## 1. Quick Start (runs locally in ~5 minutes, zero external services required)

**Requirements:** Node.js 18.18+ (Node 20 recommended), npm.

```bash
# 1. Install dependencies
npm install

# 2. Copy .env.example to .env and set DATABASE_URL / DIRECT_URL to a Postgres
#    database. A free Neon branch (neon.tech) is the quickest option; a local
#    Postgres works too. The schema targets PostgreSQL — a SQLite "file:" URL
#    will fail with a provider mismatch.

# 3. Generate the Prisma client and apply migrations
npx prisma generate
npx prisma migrate deploy

# 4. Seed the database with categories, brands, sample products, and demo accounts
npm run db:seed

# 5. Start the dev server
npm run dev
```

Open **http://localhost:3000**.

Or run all of steps 1–4 in one go: `npm run setup`.

### Demo accounts (created by the seed script)

| Role     | Email                  |
|----------|------------------------|
| Admin    | admin@seoulglow.com.bd |
| Customer | customer@example.com   |

**Passwords are generated randomly on every seed run and printed once** — watch the output of
`npm run db:seed` and save them. No password is hardcoded in the repository, so a known-password
admin account cannot exist just because someone ran the seed. To choose them yourself, set
`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before seeding.

The seed refuses to run when `NODE_ENV=production`, because it deletes existing orders, reviews
and users before inserting demo data.

### Changing the admin password

Normally: sign in, then **Account → Profile** (`/account/profile`). It asks for the current
password and requires the new one to be at least 6 characters.

If you're locked out, use the script — it writes directly to whatever `DATABASE_URL` points at,
and prints the target host first so you can see whether you're about to change production:

```bash
npm run admin:password admin@seoulglow.com.bd              # generates and prints a password
npm run admin:password admin@seoulglow.com.bd 'YourNewPass' # or set one explicitly
```

This matters because **`/forgot-password` cannot rescue the admin account today**. It emails a
reset link, and while the project uses Resend's shared `onboarding@resend.dev` sender, delivery
only works to the address that owns the Resend account. A link addressed to
`admin@seoulglow.com.bd` is rejected by the provider and never arrives. Verifying a domain in
Resend (see §4) removes this limitation.

(The seed script also creates three more customer accounts — `reviewer1@example.com` through `reviewer3@example.com`, same password as above — purely as authors for the demo product reviews shown on the homepage and product pages.)

Visit `/admin` after logging in as the admin account to see the dashboard, product manager, order manager, and coupon manager.

---

## 2. What's actually implemented

This is a genuinely large spec — building an enterprise multi-vendor platform to true production depth is realistically months of work for a team. What's here is a solid, **non-placeholder** application covering the full commerce flow end-to-end, plus most of the "advanced" feature list:

**Working end-to-end (click it, it does something real):**
- **Design system**: bold, badge-heavy retail merchandising layer (Olive Young-inspired stacked BEST/SALE/COUPON/HOT DEAL badges) layered over the rose-gold/cream brand identity, which stays consistent across nav/footer/logo. Auto-sliding hero carousel (arrows, play/pause, slide counter), a scrolling marquee announcement ticker, a live flash-sale countdown, and scroll-reveal animation on product rails.
- Product catalog: categories, brands, filters, sorting, live search-as-you-type with autocomplete dropdown, product detail pages with reviews/ratings, related products, frequently-bought-together bundling, a product FAQ, schema.org JSON-LD, optional 360° spin viewer
- Recently-viewed products (tracked client-side, shown on the homepage and product pages)
- Homepage: hero, categories, featured/best-seller/flash-sale/new/trending rails, brand grid, benefits section, real customer testimonials (pulled from actual reviews in the DB), blog preview, an Instagram "shop the grid" callout linking to your real profile, newsletter signup
- Brand pages with story, banners, best sellers, new arrivals
- A lightweight blog with real (if illustrative) long-form posts, not just teaser cards linking nowhere
- Cart (persisted client-side) + full checkout: shipping form, coupon codes, Dhaka/outside-Dhaka shipping rules, server-side price re-validation (never trusts client-submitted prices)
- Authentication: register/login/logout with JWT access + refresh tokens (httpOnly cookies), bcrypt hashing, role-based access, email verification, and password reset — all via real emails (see §4)
- Admin dashboard: sales/revenue stats, low-stock alerts, product CRUD, order status management, coupon management, affiliate/commission overview — protected by middleware
- Customer account dashboard: order history, order detail, profile editing, wishlist, referral/affiliate dashboard
- **Bilingual storefront: English + Bangla only**, switchable live (see §3) — this is a Bangladesh-focused store, so no other languages are included
- Live chat: WhatsApp floating button + Facebook Messenger Customer Chat plugin (see §5)
- Affiliate/referral program: unique referral codes, `?ref=` link tracking, automatic commission crediting on referred orders, customer + admin dashboards (see §6)
- Abandoned cart recovery: checkout sessions are tracked server-side and a cron-callable endpoint emails anyone who didn't complete checkout (see §7)
- SEO: dynamic metadata, Open Graph, sitemap.xml, robots.txt, JSON-LD product schema
- Analytics: GA4 / Meta Pixel / TikTok Pixel, loaded only when you set the IDs in `.env`
- Security hardening: rate limiting, CSRF origin checks, security headers, stateless-JWT action tokens — see §11
- Automated tests: Vitest unit/integration tests for cart logic, pricing, and payment-provider config detection — see §9
- Back-to-top button, branded loading screen, and a branded 404 page
- Your logo is wired into the navbar, footer, login/register, admin sidebar, favicon, browser tab icon, PWA manifest, Open Graph image, loading screen, 404 page, invoice, and every transactional email

**Design system, if you want to tweak it:**
- Badge colors (`badge-best`, `badge-sale`, `badge-coupon`, `badge-today`, `badge-new`, `badge-onetwo`) live in `tailwind.config.ts` — separate from the brand palette (`rose-gold`, `cream`, `beige`) so merchandising urgency and brand identity can be adjusted independently.
- `src/components/Badge.tsx` — the circular "stamp" badge (`BadgeStamp`) and pill tags (`BadgePill`); assign badges to products via the existing `isBestSeller` / `isFlashSale` / `isNewArrival` / `isTrending` flags on `Product` — no new schema needed.
- `src/components/Hero.tsx` — the slide content (copy, images, CTA links) is an array at the top of the file; add/remove/reorder slides there.
- Everything is English/Bangla only by design — no Korean text in the UI. "Korean vibe" comes through the badge/carousel merchandising style and the actual Korean skincare brands sold, not through Korean-language UI copy.

**Why there's no currency selector**: this is a single-market, BDT-only storefront for Bangladesh, so a currency switcher would just be decorative UI with nothing real behind it. If you ever expand beyond Bangladesh, that's a real feature to add — happy to build it then.

**Built with real integration code, but needs your credentials to go live:**
- Payment gateways (bKash, Nagad, Rocket, Visa/Mastercard/Amex, ShurjoPay) — see §13. Genuine HTTP calls to each provider's API; without credentials, checkout gracefully falls back to a "pending payment" order instead of crashing.
- Transactional email (welcome, verification, password reset, order confirmation, newsletter, abandoned cart) — see §4. Without a Resend API key, emails are logged to the console instead of sent, so nothing crashes.
- Messenger live chat — needs your Facebook Page ID (see §5).

**Deliberately out of scope** (flagged here rather than silently omitted):
- Full clean-architecture layering (repository pattern / DTOs) — the app uses Next.js API routes + Prisma directly, which is simpler and equally production-viable at this scale
- Voice search, product-to-product comparison tables
- Multi-vendor marketplace features (the schema is simple single-vendor; extending to marketplace would need a Vendor model and payout splitting)

If you want any of these built out next, tell me which ones matter most.

---

## 3. Bilingual storefront (English / Bangla)

The language switcher lives in the header (desktop: top-right; mobile: bottom of the menu). It sets a `locale` cookie server-side, so every server-rendered page picks up the chosen language on the next request — no flash of the wrong language.

- Dictionary source: `src/lib/i18n/dictionaries.ts` (add a key once, it's available in both languages)
- Server components read the cookie via `getLocale()` / `getDictionary()`
- Client components use the `useLocale()` hook
- Fully translated: navigation, homepage, product page actions, cart, checkout, auth pages, account dashboard, footer
- The admin dashboard intentionally stays English-only (standard practice for back-office tools)
- The `Product.koreanName` / `banglaName` fields already exist in the schema for bilingual product names — wire them into the product page template if you want per-product translations too

## 4. Transactional email (Resend)

Email is sent through **[Resend](https://resend.com)** via its official SDK, in `src/server/email/`.

SMTP was the original implementation and was replaced because it suits serverless badly: every
cold invocation pays a TCP + TLS + AUTH handshake before it can send, connections can't be
pooled across invocations, and several hosts block outbound port 587 outright. Resend is a plain
HTTPS API — one request, no connection state.

### Setup

1. Create a free account at **[resend.com/signup](https://resend.com/signup)** (3,000 emails/month,
   no card required).
2. Go to **API Keys → Create API Key**, give it *Sending access*, and copy the value — it is shown
   **once**. Keys look like `re_xxxxxxxx_...`.
3. Add it to `.env` locally (gitignored) and to **Vercel → Settings → Environment Variables** for
   Production and Preview:

```bash
RESEND_API_KEY="re_your_key_here"
EMAIL_FROM=""   # optional, see below
```

Vercel snapshots environment variables into a deployment when it is created, so **redeploy after
adding the key** — it will not apply to existing deployments.

### Sender address — read this before going live

The default sender is Resend's shared `onboarding@resend.dev`, which needs no DNS setup. It has one
significant limitation: **it can only deliver to the email address that owns the Resend account.**
Mail to anyone else is rejected. That's fine for testing, but it means customers will not receive
order confirmations.

To email real customers, verify a domain in **Resend → Domains** (add the SPF and DKIM records it
gives you at your DNS provider), then set:

```bash
EMAIL_FROM="Seoul Glow Bangladesh <orders@yourdomain.com>"
```

### What gets sent

| Email | Trigger |
|---|---|
| Welcome | On registration |
| Verification | On registration — 24-hour stateless link to `/api/auth/verify-email` |
| Password reset | From `/forgot-password` — 1-hour stateless link to `/reset-password` |
| Order confirmation | On every completed order, with an itemised summary and totals |
| Order status update | When an admin changes order status, including courier and tracking number |
| Newsletter welcome | On signup from the footer form |
| Abandoned cart | See §7 |
| Contact form | To the support inbox, with `replyTo` set to the sender |

### Failure handling

`send()` in `src/server/email/index.ts` is the only place that talks to the provider, and it
**never throws**. Every call site is fire-and-forget — a customer who completed checkout must not
see an error because the mail API had a bad minute. Failures return `{ sent: false }` and log. The
Resend SDK reports API-level problems in an `error` field rather than by rejecting, so both that
and genuine exceptions are handled.

With no `RESEND_API_KEY`, emails are logged to the console instead of sent, so a fresh clone works
with no mail account at all.

### Checking it actually works

Every user-facing endpoint that sends email returns success regardless of what the provider did —
`/api/auth/forgot-password` must not reveal whether an address has an account. Correct, but it also
means a silently broken mail setup looks identical to a working one. So there's an admin-only
diagnostic:

```bash
# What is configured (no key is ever returned)
GET  /api/admin/email-status

# Send a real message and report what Resend said
POST /api/admin/email-status   { "to": "you@example.com" }
```

Both require an `ADMIN` or `MANAGER` session. The POST response includes Resend's message id on
success, or the provider's error message on failure.

### Templates

`templates.ts` builds each message; `shell.ts` provides the shared branded wrapper. They're
nested-table HTML with inline styles, because email clients are not browsers — Outlook renders
through Word and none of them reliably support flexbox or grid. A media query provides responsive
behaviour as progressive enhancement, and the layout is fluid to 600px rather than fixed-width.
Every interpolated value is HTML-escaped: customer names and product titles are user- and
admin-supplied.

## 5. Live chat (WhatsApp + Messenger)

- **WhatsApp**: floating button, bottom-right, always on — set `NEXT_PUBLIC_WHATSAPP_NUMBER` in `.env`.
- **Messenger**: Facebook's official Customer Chat plugin (`src/components/MessengerChat.tsx`), backed by your real Facebook Page inbox. To activate: create/select a Facebook Page → Meta for Developers → your app → Messenger settings → enable Customer Chat Plugin → whitelist your domain → set `NEXT_PUBLIC_FACEBOOK_PAGE_ID` in `.env`. Renders nothing until that variable is set.

## 6. Affiliate & referral program

- Every user gets a unique `referralCode` at signup (visible at `/account/referrals` along with a shareable link, earnings, and commission history)
- Visiting `yoursite.com/?ref=CODE` sets a 30-day cookie (`src/components/ReferralCapture.tsx`); if that visitor later registers, they're linked to the referrer
- When a referred customer completes an order, a `Commission` row is created automatically (`AFFILIATE_COMMISSION_PERCENT` in `.env` controls the rate, default 10%)
- Admins manage payouts at `/admin/affiliates` (mark commissions as paid)

## 7. Abandoned cart recovery

Since the cart itself is client-side (for speed), recovery works by tracking **checkout sessions**: when a visitor reaches checkout and enters their email, `POST /api/cart-session` snapshots their cart server-side. If they don't complete the order, that snapshot remains `recovered: false`.

Next.js has no built-in background job runner, so the recovery emails are sent by an endpoint you schedule externally:
```
GET /api/cron/abandoned-carts
Header: Authorization: Bearer <CRON_SECRET>
```
Point any scheduler at it every 30–60 minutes — [Vercel Cron](https://vercel.com/docs/cron-jobs), [cron-job.org](https://cron-job.org), or a GitHub Actions scheduled workflow all work. Sessions older than 60 minutes that haven't converted get a recovery email (`sendAbandonedCartEmail`); completing the order marks the session recovered so it's never emailed twice.

## 8. 360° product viewer

`src/components/Product360Viewer.tsx` — drag (or swipe) to spin through a sequence of product photos, the standard e-commerce 360° pattern. Wired into the product page (`ProductMediaTabs.tsx`), which shows a "Photos / 360° View" toggle automatically **only when a product has 360 frames** (`Product.images360` in the schema). Seed data ships with regular photos only — add real 360-frame photography (ideally 24–36 images shot at even angle intervals) to a product's `images360` array to activate it for that product.

## 9. Image uploads (Cloudinary)

Product images uploaded through the admin panel are stored in **Cloudinary**, not on the
server's disk. This is not a preference — serverless hosts like Vercel give each request a
read-only filesystem, so anything written into `public/uploads` either fails outright or
disappears when the invocation ends. Cloudinary also serves the images from a CDN with
automatic format negotiation, which is what you want for product photography anyway.

### Creating an account and getting credentials

1. Sign up free at **[cloudinary.com/users/register_free](https://cloudinary.com/users/register_free)**.
   The free tier covers roughly 25 GB of storage and monthly bandwidth — far beyond what a
   catalogue this size needs.
2. After signing in you land on the **Dashboard**. The **Product Environment Credentials**
   panel at the top shows three values:
   - **Cloud Name** — e.g. `dxxxxxxxx` (not secret; it appears in every image URL)
   - **API Key** — a numeric string
   - **API Secret** — click the eye icon to reveal it. **Treat this like a password.**
3. Copy all three.

### Where to put them

Local development — add to `.env` (which is gitignored):

```bash
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="your-api-secret"
```

Production — add the same three in **Vercel → Project → Settings → Environment Variables**,
for Production *and* Preview, then redeploy. These are read server-side only, so they are
never exposed to the browser (note the deliberate absence of a `NEXT_PUBLIC_` prefix).

### How uploads work

`POST /api/admin/upload` accepts `multipart/form-data` with a `file` field and returns
`{ url, publicId }`. The admin UI only consumes `url`, so nothing in the interface changed
when storage moved. The route picks its backend at request time:

| Condition | Behaviour |
|---|---|
| Cloudinary credentials present | Uploads to the `seoul-glow-bangladesh/products` folder, returns the HTTPS `secure_url` |
| No credentials, running locally | Falls back to writing `public/uploads/products` — so `npm run dev` works with no signup |
| No credentials, on Vercel | Returns **501** with an explanation, rather than an opaque filesystem error |

Only the returned URL is stored in the database (`Product.images`), so switching storage
providers later does not require a data migration — existing rows keep working because they
hold absolute URLs. Uploads are restricted to `ADMIN`, `MANAGER` and `STAFF`, capped at 5 MB,
and limited to JPG/PNG/WEBP/GIF. `res.cloudinary.com` is allowlisted in
`next.config.mjs` under `images.remotePatterns`; without that entry `next/image` rejects
the host and every uploaded image renders broken.

## 10. Automated testing

```bash
npm test          # run once
npm run test:watch
```

Vitest covers real logic, not placeholder assertions: currency/discount formatting, the Zustand cart store (add/remove/quantity-clamping/subtotal), referral code generation, and each payment provider's `isConfigured()` detection. Test files live next to what they test in `__tests__/` folders. This is a foundation, not full coverage — API route handlers and React components aren't yet tested; `vitest.config.ts` is set up so adding `@testing-library/react` for component tests is a small next step.

---

## 11. Performance

- **ISR over force-SSR**: the homepage, product pages, and brand pages use Incremental Static Regeneration (`revalidate = 60`) instead of rendering fresh on every request — most visits are served cached HTML, with the underlying Prisma queries also cached via `unstable_cache` where a page reads a per-request cookie (locale) that would otherwise force full dynamic rendering.
- **Self-hosted fonts**: `next/font/google` (Cormorant Garamond + Inter) instead of a CSS `@import` — fonts are downloaded once at build time and served from your own domain, avoiding a render-blocking round trip to Google Fonts and eliminating layout shift (`display: swap`).
- **Route-level loading skeletons** (`loading.tsx` in the root, `/shop`, and `/product/[slug]`) so navigation feels instant instead of showing a blank page while data fetches.
- **Sitemap caching**: `revalidate = 3600` so search engine crawlers don't trigger a full database query on every crawl.
- Product images use `next/image` with explicit `sizes` for responsive loading; the shop/brand/product grids only request the image size actually needed at each breakpoint.
- Unused dependencies removed (e.g. `framer-motion` was in `package.json` but never imported anywhere) to keep install size and attack surface down.

**Not yet done**: no bundle analyzer pass, no explicit code-splitting beyond Next's automatic per-route splitting, and the admin dashboard queries (revenue aggregates, low-stock lookups) aren't cached — acceptable for low admin traffic, but worth adding `unstable_cache` there too if the catalog grows large.

## 12. Security

- **CSRF protection** (`src/middleware.ts`): every state-changing API request (`POST`/`PATCH`/`DELETE`) is checked against its `Origin`/`Referer` header — a cross-site request is rejected with 403. This is defense-in-depth on top of `sameSite=lax` cookies, which already block most cross-site submissions. Payment-gateway callbacks and the cron endpoint are exempted (they're legitimately hit from outside the browser) and instead authenticate via server-to-server verification / a bearer secret respectively.
- **Rate limiting** (`src/lib/rate-limit.ts`) on login (10/5min), registration (5/hour), password reset (3/15min), checkout (10/10min), cart-session tracking, and newsletter signup — all keyed by IP. In-memory by default — fine for a single instance; swap in Redis/Upstash for multi-instance deployments (see the code comment for the exact interface to match).
- **Security headers** (`next.config.mjs`): `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, and a `Content-Security-Policy` on every route. The CSP allows `unsafe-inline` scripts/styles (needed for the analytics/Messenger bootstrap snippets without adding nonce plumbing) but still restricts script/frame/connect origins to the specific third parties actually in use.
- **Payment verification**: see §13 — every callback does real server-to-server verification before an order is ever marked paid.
- **Stateless action tokens**: email verification and password reset links are purpose-scoped JWTs (`signActionToken`/`verifyActionToken`) — a verification link can never be replayed as a password-reset link.
- **Server-side price recalculation**: checkout never trusts client-submitted prices (see `src/app/api/orders/route.ts`) — every price is re-derived from the database at order time.
- **Admin API input hardening**: every `/api/admin/*` mutation route validates its body against an explicit zod schema and whitelist of fields — none of them spread a raw request body into a Prisma `data` object, which would otherwise let a caller set arbitrary columns.
- **Auth**: httpOnly, sameSite cookies; bcrypt password hashing; role checks enforced in both `middleware.ts` (page-level) and every `/api/admin/*` route handler (API-level) — so a route isn't only "protected" by hiding its link.
- Password reset requests never reveal whether an email exists in the system.

**Known gaps to address before real production traffic**: rate limiting is in-memory only (resets on redeploy, doesn't share state across instances — see the Redis note above), and there's no automated dependency/vulnerability scanning configured (run `npm audit` periodically, or wire up Dependabot/Snyk).

---

## 13. Switching databases (MySQL / PostgreSQL / MariaDB / SQL Server)

The app defaults to SQLite so it runs with zero setup. To switch:

1. Open `prisma/schema.prisma` and change the `provider` in the `datasource db` block, e.g.:
   ```prisma
   datasource db {
     provider = "mysql"   // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
2. Update `DATABASE_URL` in `.env` (examples are in `.env.example`), e.g. for MySQL Workbench:
   ```
   DATABASE_URL="mysql://root:yourpassword@localhost:3306/seoul_glow"
   ```
3. Re-run:
   ```bash
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

No application code needs to change — all queries go through Prisma's database-agnostic query API.

---

## 14. Activating real payments (Bangladesh gateways)

Every gateway integration in `src/lib/payments/` makes real HTTP calls to that provider's sandbox/production API. To go live:

1. Get merchant credentials from each provider (bKash Merchant/PGW, Nagad Merchant onboarding, SSLCommerz store, ShurjoPay account).
2. Paste them into `.env` (see the "Bangladesh Payment Gateways" section — every variable is documented there).
3. Redeploy. `provider.isConfigured()` automatically detects the credentials and switches the flow from "pending" to live redirect.

Visa/MasterCard/American Express and Rocket are routed through **SSLCommerz**, which is the standard way Bangladeshi merchants accept card payments — you don't need a separate integration for cards.

**Payment verification**: every callback route (`src/app/api/payments/*/callback/route.ts`) now performs the provider's required server-to-server verification — bKash's "execute payment", Nagad's "verify payment", SSLCommerz's "Order Validation API" (`val_id`), and ShurjoPay's "verification" endpoint — before ever marking an order paid. The redirect status alone is never trusted, since a browser could replay or forge that URL; the DB update only happens after the gateway's own servers confirm the transaction (`src/lib/payments/confirm.ts` is the single place that flips an order to PAID/FAILED). The order's `gatewayTransactionId` (set right after `initPayment`) is what lets the callback look the order back up.

---

## 15. Docker

```bash
docker compose up --build
```

`docker-compose.yml` is configured for MySQL by default. Before using it, follow §12 to switch `prisma/schema.prisma`'s provider to `mysql` — the compose file's `DATABASE_URL` already points at the bundled MySQL container.

---

## 16. Project structure

This is a single Next.js project (frontend and backend intentionally share one codebase —
no CORS, no cross-origin cookies, one `npm install`, one server to run) but the code
itself is organized so it's obvious what's "backend" vs "frontend" when you go to edit
something:

```
prisma/
  schema.prisma       Database schema (User, Product, Order, Coupon, Review, etc.)
  seed.ts             Seed script: categories, brands, 18 sample products, demo accounts

src/
  server/             ── BACKEND-ONLY. Never imported by anything the browser runs. ──
    db.ts             Prisma client singleton
    auth.ts           JWT + password hashing + stateless action-token helpers
    rate-limit.ts      In-memory rate limiter for auth/checkout endpoints
    email/            Resend client, HTML templates, and send functions
    payments/         Modular payment gateway integrations (one file per provider)
      __tests__/      Vitest tests for payment provider config detection

  app/                ── ROUTES. Next.js file-based routing requires these to live here. ──
    api/              Backend REST-style endpoints (auth, products, orders, payments, admin/*)
                      — these import from src/server/, this is "the backend" in practice
    admin/            Admin dashboard pages (protected by middleware.ts)
    account/          Customer dashboard pages
    (shop, product, cart, checkout, login, etc.) — customer-facing pages
    error.tsx / global-error.tsx   Error boundaries — shows a real error screen instead
                                   of a silently broken page if something throws

  components/         ── FRONTEND. This is what you'll edit most for design/UI changes. ──
    admin/            Admin-only components

  lib/                Shared code used by BOTH frontend and backend (pure functions,
                      no secrets) — formatting helpers, the i18n dictionaries, the
                      client-side cart store, blog post data, recently-viewed tracking
    i18n/             English/Bangla dictionaries + server & client locale helpers
    cart-store.ts     Zustand cart store (persisted to localStorage) — frontend-only
    utils.ts          formatBDT/discountedPrice (used by components) +
                      generateOrderNumber/shippingFeeFor (used by API routes)

  middleware.ts       Protects /admin/** routes + CSRF origin-check for /api/**

public/
  logo.png            Your brand logo (also used to generate favicons/app icons)
```

**Rule of thumb for editing**: changing how something *looks* → `src/components/` or a
page file under `src/app/`. Changing how something *works* (data, validation, payments,
emails, auth) → `src/server/` or the relevant `src/app/api/*/route.ts` file. If you're
ever unsure which file to touch, search for the page's URL path under `src/app/` first.

**Why not a fully separate backend (e.g. a standalone Express server in its own folder)?**
That would mean rewriting every API route in Express, and — the part that actually bites —
handling login cookies across two different origins, which requires `SameSite=None` +
HTTPS even on localhost, plus CORS configuration, plus running two servers instead of one.
It's a legitimate architecture for a larger team, but for one person maintaining this site,
it roughly doubles the moving parts without a corresponding benefit. If you outgrow this
setup later (e.g. multiple frontends hitting the same API), this is a well-trodden
migration path — the `src/server/` folder above is already shaped to make that split
easier if that day comes.

## 17. Build for production

```bash
npm run build
npm start
```

## 18. Environment variables

See `.env.example` for the full documented list (database, JWT secrets, payment gateway credentials, analytics IDs, contact info). Copy it to `.env` and fill in real values before deploying — the included `.env` has safe local-dev defaults only.
