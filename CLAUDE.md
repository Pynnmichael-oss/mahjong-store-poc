# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start Vite dev server (localhost:5173)
npm run build     # production build to dist/
npm run preview   # serve the production build locally
```

No test runner is configured.

## Environment

Requires a `.env` file at root:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SQUARE_APP_ID=your-square-app-id
VITE_SQUARE_LOCATION_ID=your-square-location-id
```

## Architecture

**Stack:** React 18 + Vite + Tailwind CSS v3 + Supabase (auth + database). No TypeScript — plain JSX. Deployed via **Netlify** (`netlify.toml` with a catch-all `/*` → `/index.html` redirect).

## Critical Constraints — Never Change
- **Router:** `BrowserRouter` only — never switch to HashRouter
- **`vite.config.js` base:** must always be `'/'` — never set to a subdirectory
- **Deployment:** Netlify only — never run `npm run deploy` or touch gh-pages config

**Routes** (`src/routes/AppRouter.jsx`):
- Public: `/` (AboutPage), `/kiosk` (no auth guard — intentional)
- `PublicOnlyRoute`: `/login`, `/signup`
- `ProtectedRoute` (any logged-in user): `/dashboard`, `/sessions`, `/sessions/:id/reserve`, `/events`, `/my-qr`, `/history`, `/profile`
- `EmployeeRoute`: `/employee`, `/employee/sessions`, `/employee/sessions/:id`, `/employee/events`, `/employee/members`, `/employee/reports`

**`LandingPage.jsx`** (`src/pages/LandingPage.jsx`) — public self-service guest booking page; currently **not wired into the router**. Implements a 3-step wizard (pick session → pick seat → enter name/phone) via `useGuestBooking` hook, then calls `createGuestReservation` and shows a confirmation card. When added to the router it must be a public (no-auth) route.

**Two user roles** controlled by `profiles.role`:
- `customer` — books seats, views QR code, RSVPs to events
- `employee` — manages sessions, checks in attendees, manages events/members

Auth is handled by `AuthContext` (`src/context/AuthContext.jsx`), which fetches the user's `profiles` row on login and exposes `{ user, profile, isEmployee, loading, signOut }`. Route guards (`ProtectedRoute`, `EmployeeRoute`, `PublicOnlyRoute`) live in `src/routes/ProtectedRoute.jsx`.

**Data layer pattern:** thin service functions in `src/services/` make direct Supabase queries; custom hooks in `src/hooks/` wrap them with `useState`/`useEffect` and expose `{ data, loading, error, refresh }`. Pages consume hooks, not services directly.

**Components** in `src/components/` are organized by domain: `seats/` (SeatButton, SeatMap, TableDisplay), `sessions/` (SessionCard, SessionList), `employee/` (AttendeeRow, AttendeeTable, WalkInForm, SessionCreateModal, etc.), `reservations/` (OverageFlagBanner, ReservationSummary, ReservationStatusBadge), `events/` (EventCard, EventForm, EventList, EventRSVPButton), `checkin/` (CameraScanner, QRCodeDisplay, QRScanInput), `ui/` (shared primitives), `layout/` (Header, CustomerHeader, PageWrapper, FloatingTiles, WaveDivider).

**Business rules** (`src/lib/businessRules.js`):
- **Membership tiers** (canonical keys in `MEMBERSHIP_CONFIG`):
  - `dragon_pass` — $149.99/mo, unlimited, 2 buddy passes/mo, early event access, 15% event discount
  - `flower_pass` — $79.99/mo, 2 sessions/week (`weeklyLimit: 2`), $15 overage per extra session
  - `bamboo_pass` — $49.99/mo, 1 session/week (`weeklyLimit: 1`), $15 overage per extra session
  - `four_winds_member` — Free account, $15 per session
- `walk_in` membership type is **retired** — migrated to `four_winds_member`. `walk_in` still exists as a reservation STATUS (unchanged).
- `getMembershipConfig(unknownType)` falls back to `four_winds_member`
- Weekly limit is Mon–Sun anchored to the **session's date**, not the current week. `getWeekBoundariesForDate(dateStr)` in `src/lib/dateUtils.js` computes Mon–Sun from a `YYYY-MM-DD` string; `getWeekBoundaries()` (current week) is still exported for other uses
- `countPlaysForSessionWeek(reservations, sessionDate)` — filters `is_primary_seat: true` reservations and counts those falling in the session's week. Pass `sessionDate` (YYYY-MM-DD) when booking; omit to fall back to current week
- Overage flag: `shouldFlagOverage(membershipType, weeklyCount)` — returns true when weekly count ≥ weekly limit
- `useWeeklyLimit(reservations, membershipType, sessionDate?)` (`src/hooks/useWeeklyLimit.js`) — convenience hook that wraps both of the above; returns `{ checkedInCount, isOverLimit }`
- `useWeeklySessionCount()` (`src/hooks/useMonthlySessionCount.js`) — for display only (profile, header); queries the current Mon–Sun week. Exported as `useMonthlySessionCount` for backward compat — use `useWeeklySessionCount` for new code
- `useFillRateReport(startDate, endDate)` (`src/hooks/useReports.js`) — fetches sessions in a date range and their reservations; returns `{ data: [{ session, reservations }], loading, error }`; used by `ReportsPage`
- `useGuestBooking()` (`src/hooks/useGuestBooking.js`) — multi-step wizard state for the public guest landing page; tracks `step` (1 | 2 | 3 | 'confirmed'), selected session/seat, guest name/phone; exposes `selectSession`, `selectSeat`, `submitBooking`, `reset`, `backToSessions`, `backToSeats`
- Check-in window: 15 minutes from session start time
- Seats are grouped into 8 tables (Table 1–8), 4 seats each — `getTableForSeat(seatNumber)` maps seat numbers to tables
- Use `getMembershipConfig(type)` for all tier lookups; `MEMBERSHIP_TIERS` is a backward-compat alias

**Booking** (`src/services/reservationService.js`):
- Multi-seat booking uses the `reserve_seats` Supabase RPC (not direct inserts) — call it instead of `supabase.from('reservations').insert(...)` for new bookings
- Active reservation statuses for duplicate-check purposes: `['confirmed', 'walk_in', 'checked_in']` — `cancelled` is always excluded

**Buddy passes** (`src/services/buddyPassService.js`):
- Dragon Pass members get 2 guest passes/month, stored in `buddy_passes` table
- Flow: `getOrCreateBuddyPass` (RPC) → member shares 6-char code → guest uses `checkBuddyPassCode` to validate → `redeemBuddyPass` (RPC) books seat and decrements `used_count`

**Check-in and walk-in** (`src/services/attendanceService.js`):
- `processQRCheckin(userId, sessionId)` — employee-side QR scan flow: validates reservation, enforces 15-min check-in window, calls `checkInReservation`
- `addWalkIn({ userId, sessionId, seatId, membershipType, employeeId })` — creates a `walk_in` status reservation directly (bypasses `reserve_seats` RPC); used after walk-in payment is collected

**Guest reservations** (`src/services/guestService.js`):
- Employees can book non-member guests via `create_guest_reservation` RPC
- On success, automatically invokes `send-sms` Supabase Edge Function to SMS the guest

**Booking cost** (`src/lib/calculateBookingCost.js`):
- `calculateBookingCost({ membershipType, seatCount, weeklySessionsUsed })` — returns `{ ownSeatCost, guestSeatCost, totalCents, extraSeats, isFree, isOverage }` in cents
- Extra seats (beyond the member's own) are always $15 for all membership types. Dragon Pass members use the buddy pass flow (separate system) for free guests — not a cost override here.
- Use this instead of computing costs inline

**Payments** (`src/services/paymentService.js`):
- Card payments go through `square-payment` Supabase Edge Function via `chargeCard()`
- Used for walk-in fees and overage charges; passes `reservationId` or `membershipType` for tracking

**Supabase Edge Functions** (`supabase/functions/`):
- All four functions use a shared `verifyAuth(req)` helper that validates the Bearer JWT, returns `{ userId, role }`, and throws on failure — the caller returns a 401.
- `square-payment/` — processes Square card charges (one-time or card-on-file via `squareCustomerId`/`cardId`)
- `save-card/` — tokenises and vaults a Square card; stores `square_customer_id` + `square_card_id` on `profiles`
- `send-sms/` — sends SMS confirmations to guests
- `square-refund/` — issues a Square refund and updates the `payments` row (`status: 'refunded'`, `square_refund_id`, `refunded_at`, `refunded_by`)

**Saved-card flow** (`src/services/cardService.js`):
- `getSavedCard(userId)` — reads `square_customer_id` / `square_card_id` from `profiles`
- `saveCard({ userId, token, email, displayName })` → invokes `save-card` Edge Function → returns `{ squareCardId, squareCustomerId, cardLast4, cardBrand }`
- `chargeCardOnFile({ userId, squareCustomerId, cardId, amountCents, … })` → invokes `square-payment` with stored card credentials
- `SessionPaymentGate` (`src/components/ui/SessionPaymentGate.jsx`) orchestrates the full reservation-time payment UX: checks if payment is required, shows saved card or Square card entry form, then calls `onPaymentComplete(paymentId | null)`. Accepts `onPaymentFailed` prop — called on any payment error so the caller can release seats and reset UI. Uses `useRef` (not `useState`) for double-tap guard to avoid re-render races.

**Cancellation and refund flow:**
- `checkCancellationEligibility(reservationId, userId)` in `cancellationService.js` calls the `get_cancellation_eligibility` Supabase RPC — returns `{ eligible, refundable, refund_amount, square_payment_id, hours_until, … }`
- `cancelReservation({ reservationId, groupId, cancelWholeGroup, userId })` in `cancellationService.js` — cancels reservation rows and frees seats
- `processRefund({ squarePaymentId, amountCents })` in `cancellationService.js` — invokes the `square-refund` Edge Function, forwarding the user's Supabase auth token
- `CancelReservationModal` (`src/components/ui/CancelReservationModal.jsx`) — three display states: within 24-hour window (no refund), outside window with free booking, outside window with paid refund. Group-booking toggle shown for group reservations outside the 24-hour window.
- Cancellation window: **24 hours** before session start. Cancellations within this window are not refundable.
- The `get_cancellation_eligibility` and `cancel_reservation_with_refund` RPCs must exist in Supabase (SQL run manually — see comment block in `cancellationService.js`).
- The `payments` table requires three columns added via SQL: `square_refund_id TEXT`, `refunded_at TIMESTAMPTZ`, `refunded_by UUID REFERENCES auth.users(id)`.

**Database schema (key tables):**
- `profiles` — extends `auth.users`; `role`, `membership_type`, `is_active`, `member_number`
- `sessions` — `date`, `start_time`, `end_time`, `total_seats`, `status`
- `seats` — `session_id`, `seat_number`, `status` (available/reserved/occupied)
- `reservations` — `user_id`, `session_id`, `seat_id`, `status` (confirmed/checked_in/no_show/cancelled/walk_in), `is_flagged_overage`, `is_walk_in`, `is_primary_seat` (true for the member's own seat, false for extra/guest seats), `membership_type_at_booking`, `override_by`, `override_at`, `group_reservation_id`
- `payments` — `user_id`, `amount_cents`, `status` (pending/completed/refunded), `square_payment_id`, `square_refund_id`, `refunded_at`, `refunded_by`, `reference_id` (reservation UUID)
- `buddy_passes` — `owner_id`, `code`, `used_count`, `max_uses`, month-scoped
- `events` / `event_rsvps` — event listings and RSVP tracking

`seed.sql` in the repo root seeds Supabase with 5 test users (password: `password123`): 4 four_winds_members and 1 employee (`employee@mahjongstore.com`).

## Kiosk Mode

`/kiosk` — full-screen self-serve check-in page for the front-door iPad + Zebra USB barcode scanner.

- The Zebra scanner acts as a HID keyboard: it types the user's UUID (from their QR code) into a hidden `<input>`, then fires Enter. No camera API is used.
- Calls `kiosk_check_in(p_user_id)` Supabase RPC (SECURITY DEFINER). The function finds the nearest open session (within a 2-hour window before start + 15 min after), finds the member's `is_primary_seat = true` reservation, and marks it `checked_in`.
- The RPC SQL must be run manually once in the Supabase SQL editor — it is not in any migration file (see the comment block at the top of `src/pages/KioskPage.jsx`).
- States: `idle` (pulsing QR icon, hidden input focused) → `loading` → `success` (green, 4 s) or `error` (red, 3 s) → back to `idle`.
- There is no auth guard on `/kiosk` — it is intentionally public. The subtle "Exit kiosk" link in the bottom-right navigates to `/employee`.

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
# Fri May 15 02:26:48 PM CDT 2026
