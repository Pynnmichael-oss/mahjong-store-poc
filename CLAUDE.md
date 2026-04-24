# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start Vite dev server (localhost:5173)
npm run build     # production build to dist/
npm run preview   # serve the production build locally
npm run deploy    # build + push to gh-pages branch
```

No test runner is configured.

## Environment

Requires a `.env` file at root:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Architecture

**Stack:** React 18 + Vite + Tailwind CSS v3 + Supabase (auth + database). No TypeScript — plain JSX. Deployed via GitHub Pages (HashRouter — required, do not change to BrowserRouter).

**Two user roles** controlled by `profiles.role`:
- `customer` — books seats, views QR code, RSVPs to events
- `employee` — manages sessions, checks in attendees, manages events/members

Auth is handled by `AuthContext` (`src/context/AuthContext.jsx`), which fetches the user's `profiles` row on login and exposes `{ user, profile, isEmployee, loading, signOut }`. Route guards (`ProtectedRoute`, `EmployeeRoute`, `PublicOnlyRoute`) live in `src/routes/ProtectedRoute.jsx`.

**Data layer pattern:** thin service functions in `src/services/` make direct Supabase queries; custom hooks in `src/hooks/` wrap them with `useState`/`useEffect` and expose `{ data, loading, error, refresh }`. Pages consume hooks, not services directly.

**Business rules** (`src/lib/businessRules.js`):
- **Membership tiers** (canonical keys in `MEMBERSHIP_CONFIG`):
  - `dragon_pass` — $149.99/mo, unlimited, 2 buddy passes/mo, early event access, 15% event discount
  - `flower_pass` — $89.99/mo, 8 sessions/month (`monthlyLimit: 8`), Saturday warning
  - `four_winds_member` — Free account, pay walk-in rate per session
  - `walk_in` — pay per session, no account benefits
  - `subscriber` — legacy, 3 plays/week (`weeklyLimit: 3`)
  - `unlimited` — backward-compat shim for old DB rows, maps to Dragon Pass legacy
- Weekly session count uses Mon–Sun boundaries in America/Chicago timezone (`src/lib/dateUtils.js`)
- Overage flagging: `subscriber` members who've used 3 sessions get `is_flagged_overage = true`
- Monthly limit warning: `flower_pass` members who've hit 8 sessions get flagged via `shouldWarnMonthlyLimit`
- Check-in window: 15 minutes from session start time
- Seats are grouped into 8 tables (Table 1–8), 4 seats each — `getTableForSeat(seatNumber)` maps seat numbers to tables
- Use `getMembershipConfig(type)` for all tier lookups; `MEMBERSHIP_TIERS` is a backward-compat alias

**Buddy passes** (`src/services/buddyPassService.js`):
- Dragon Pass members get 2 guest passes/month, stored in `buddy_passes` table
- Flow: `getOrCreateBuddyPass` (RPC) → member shares 6-char code → guest uses `checkBuddyPassCode` to validate → `redeemBuddyPass` (RPC) books seat and decrements `used_count`

**Guest reservations** (`src/services/guestService.js`):
- Employees can book non-member guests via `create_guest_reservation` RPC
- On success, automatically invokes `send-sms` Supabase Edge Function to SMS the guest

**Payments** (`src/services/paymentService.js`):
- Card payments go through `square-payment` Supabase Edge Function via `chargeCard()`
- Used for walk-in fees and overage charges; passes `reservationId` or `membershipType` for tracking

**Supabase Edge Functions** (`supabase/functions/`):
- `square-payment/` — processes Square card charges
- `send-sms/` — sends SMS confirmations to guests

**Database schema (key tables):**
- `profiles` — extends `auth.users`; `role`, `membership_type`, `is_active`, `member_number`
- `sessions` — `date`, `start_time`, `end_time`, `total_seats`, `status`
- `seats` — `session_id`, `seat_number`, `status` (available/reserved/occupied)
- `reservations` — `user_id`, `session_id`, `seat_id`, `status` (confirmed/checked_in/no_show/cancelled/walk_in), `is_flagged_overage`, `is_walk_in`, `membership_type_at_booking`, `override_by`, `override_at`
- `buddy_passes` — `owner_id`, `code`, `used_count`, `max_uses`, month-scoped
- `events` / `event_rsvps` — event listings and RSVP tracking

`seed.sql` in the repo root seeds Supabase with 5 test users (password: `password123`): 2 subscribers, 2 walk-ins, and 1 employee (`employee@mahjongstore.com`).

## Design System

**Brand:** Four Winds — refined, elegant, boutique social club aesthetic.

**Fonts** (Google Fonts, imported in `index.html`):
- `font-playfair` → Playfair Display — all headings, brand name
- `font-cormorant` → Cormorant Garamond — body text, descriptions, italic copy
- `font-sans` → DM Sans — UI labels, buttons, nav, data

**Color palette** (defined as CSS variables in `:root` and Tailwind custom colors):
- `navy` `#1a3a6b` — hero backgrounds, primary buttons, headers
- `navy-deep` `#0f2347` — deepest surfaces, button hover
- `sky` `#b8d4f5` — hero text, primary button text, accents
- `sky-mid` `#7aaee0` — section tags, links, eyebrow text
- `sky-light` `#e6f1fb` — badge backgrounds, subtle fills
- `sky-pale` `#f0f6fd` — hover states, alternating rows
- `gold` `#c9a84c` — today highlight, overage fee indicators, special accents
- `gold-light` `#f0e6c8` — gold card backgrounds
- `cream` `#faf8f3` — section backgrounds, alternating areas
- `warm-white` `#fffef9` — main page background, card surfaces
- `text-mid` `#4a5568` — secondary text
- `text-soft` `#8a9bb0` — labels, placeholders, muted info

**Layout conventions:**
- Main background: `bg-warm-white`
- Page sections alternate: `bg-warm-white` / `bg-cream`
- Navy hero strip at top of each page (Playfair heading in `text-sky`)
- Cards: `bg-white rounded-2xl border border-navy/8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-250`
- Primary button: `bg-navy text-sky rounded-full hover:bg-navy-deep`
- Ghost button: transparent, `border-[1.5px] border-navy`, `rounded-full`
- Section eyebrow tags: `font-sans text-[11px] uppercase tracking-[4px] text-sky-mid`
- Today highlights: `border-l-4 border-l-gold`

**Components to always use:**
- `src/components/ui/` — Button, Badge, Modal, Alert, LoadingSpinner, EmptyState, SectionTag, FadeUp
- `src/components/layout/FloatingTiles.jsx` — used on auth pages only (navy bg floating animation)
- `FadeUp` — wraps major content blocks for scroll-triggered fade-in
- `PageWrapper` — wraps every authenticated page; use `noPad` prop when page has its own navy hero strip

**Circular seat tables:** `TableDisplay` renders 8 seats around a 300px container using CSS `transform/translate` positioning. Table center is navy with Playfair italic sky text. Orbit radius is 112px.

**Mobile:** all pages must work at 390px. Sticky bottom panels use `fixed bottom-0`. Employee walk-in button is fixed on mobile, inline on desktop (`hidden sm:flex` / `sm:hidden`).
