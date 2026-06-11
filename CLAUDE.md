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
- Public (no auth): `/` (AboutPage), `/privacy`, `/terms`, `/kiosk` (no auth guard — intentional)
- `PublicOnlyRoute`: `/login`, `/signup`, `/forgot-password`
- `/reset-password` — **not** wrapped in PublicOnlyRoute (email recovery links arrive with a temporary session; wrapping would redirect them away)
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
- **Feature flag:** `BUDDY_PASS_ENABLED = false` — gates all buddy pass UI and logic. Set to `true` to re-enable everywhere at once.
- **Membership tiers** (canonical keys in `MEMBERSHIP_CONFIG`):
  - `dragon_pass` — $149.99/mo, unlimited, early event access, 15% event discount. Buddy passes: 2 when `BUDDY_PASS_ENABLED`, else 0.
  - `flower_pass` — $79.99/mo, 2 sessions/week (`weeklyLimit: 2`), $15 overage per extra session
  - `bamboo_pass` — $49.99/mo, 1 session/week (`weeklyLimit: 1`), $15 overage per extra session
  - `four_winds_member` — Free account, $15 per session
  - `founding_member` — $120/mo, unlimited, charter recognition, early events, 15% discount. Buddy passes: 2 when `BUDDY_PASS_ENABLED`, else 0. Filtered out of the plan-change picker for existing members. Signup window ends 2026-06-04.
- `walk_in` membership type is **retired** — migrated to `four_winds_member`. `walk_in` still exists as a reservation STATUS (unchanged).
- `getMembershipConfig(unknownType)` falls back to `four_winds_member`
- `getMembershipBadgeClasses(type)` — returns Tailwind classes. `founding_member` uses `bg-navy text-gold` (navy background, gold text) with a crown SVG icon rendered inline wherever the badge appears.
- `isFoundingMember(type)` — returns `true` if type is `'founding_member'`; use this to conditionally render the crown icon.
- Weekly limit is Mon–Sun anchored to the **session's date**, not the current week. `getWeekBoundariesForDate(dateStr)` in `src/lib/dateUtils.js` computes Mon–Sun from a `YYYY-MM-DD` string; `getWeekBoundaries()` (current week) is still exported for other uses
- `countPlaysForSessionWeek(reservations, sessionDate)` — filters `is_primary_seat: true` reservations and counts those falling in the session's week. Pass `sessionDate` (YYYY-MM-DD) when booking; omit to fall back to current week
- Overage flag: `shouldFlagOverage(membershipType, weeklyCount)` — returns true when weekly count ≥ weekly limit
- `useWeeklyLimit(reservations, membershipType, sessionDate?)` (`src/hooks/useWeeklyLimit.js`) — convenience hook; returns `{ checkedInCount, isOverLimit }`
- `useWeeklySessionCount()` (`src/hooks/useMonthlySessionCount.js`) — for display only; exported as `useMonthlySessionCount` for backward compat — use `useWeeklySessionCount` for new code
- `useFillRateReport(startDate, endDate)` (`src/hooks/useReports.js`) — returns `{ data: [{ session, reservations }], loading, error }`
- `useGuestBooking()` (`src/hooks/useGuestBooking.js`) — multi-step wizard state for the public guest landing page
- Check-in window: 15 minutes from session start time
- Seats are grouped into 8 tables (Table 1–8), 4 seats each — `getTableForSeat(seatNumber)` maps seat numbers to tables
- Use `getMembershipConfig(type)` for all tier lookups; `MEMBERSHIP_TIERS` is a backward-compat alias

**Booking** (`src/services/reservationService.js`):
- Multi-seat booking uses the `reserve_seats` Supabase RPC (not direct inserts)
- Payment linking uses the `link_payment_to_reservation` SECURITY DEFINER RPC — not a direct `payments` table update
- Active reservation statuses for duplicate-check purposes: `['confirmed', 'walk_in', 'checked_in']` — `cancelled` is always excluded
- `addSeatsToBooking` updates seat status to `'reserved'` for each newly added seat via `Promise.allSettled`; if any seat status update fails, it throws ("Seats were reserved but seat status failed to update. Please contact staff.") even though the reservation rows were already created

**Buddy passes** (`src/services/buddyPassService.js`):
- Currently disabled behind `BUDDY_PASS_ENABLED = false`
- When enabled: Dragon Pass members get 2 guest passes/month, stored in `buddy_passes` table
- Flow: `getOrCreateBuddyPass` (RPC) → member shares 6-char code → guest uses `checkBuddyPassCode` to validate → `redeemBuddyPass` (RPC) books seat and decrements `used_count`

**Subscriptions** (`src/services/subscriptionService.js`):
- `getPlanVariationId(membershipType)` — returns the production Square plan variation ID for a given tier
- `createSubscription({ planVariationId, membershipType, cardToken, email, displayName })` — invokes `create-subscription` Edge Function
- `cancelSubscription({ subscriptionId })` — invokes `cancel-subscription` Edge Function
- `changeSubscription({ userId, oldSubscriptionId, newPlanVariationId, newMembershipType, squareCustomerId, squareCardId, email, displayName })` — cancels old sub then creates new one reusing card on file
- Production Square plan variation IDs are stored here (not sandbox). Do not replace with sandbox IDs.
- **`src/pages/auth/SignupPage.jsx` has its own local `PLAN_VARIATION_IDS` constant** (used during signup flow) — keep it in sync with `subscriptionService.js`. Both are currently set to production IDs.

**Check-in and walk-in** (`src/services/attendanceService.js`):
- `processQRCheckin(userId, sessionId)` — employee-side QR scan flow: validates reservation, enforces 15-min check-in window, calls `checkInReservation`
- `addWalkIn({ userId, sessionId, seatId, membershipType, employeeId })` — creates a `walk_in` status reservation directly (bypasses `reserve_seats` RPC); used after walk-in payment is collected

**Guest reservations** (`src/services/guestService.js`):
- Employees can book non-member guests via `create_guest_reservation` RPC
- On success, automatically invokes `send-sms` Supabase Edge Function to SMS the guest

**Booking cost** (`src/lib/calculateBookingCost.js`):
- `calculateBookingCost({ membershipType, seatCount, weeklySessionsUsed })` — returns `{ ownSeatCost, guestSeatCost, totalCents, extraSeats, isFree, isOverage }` in cents
- Extra seats (beyond the member's own) are always $15. Use this instead of computing costs inline.

**Payments** (`src/services/paymentService.js`):
- Card payments go through `square-payment` Supabase Edge Function via `chargeCard()`
- Used for walk-in fees and overage charges; passes `reservationId` or `membershipType` for tracking

**Supabase Edge Functions** (`supabase/functions/`):
- All auth-required functions use a shared `verifyAuth(req)` helper that validates the Bearer JWT, returns `{ userId, role }`, and throws on failure — the caller returns a 401.
- `square-payment/` — processes Square card charges (one-time or card-on-file via `squareCustomerId`/`cardId`)
- `save-card/` — tokenises and vaults a Square card; stores `square_customer_id` + `square_card_id` on `profiles`
- `send-sms/` — sends SMS confirmations to guests
- `square-refund/` — issues a Square refund and updates the `payments` row (`status: 'refunded'`, `square_refund_id`, `refunded_at`, `refunded_by`)
- `create-subscription/` — creates a Square subscription. Accepts `existingCustomerId` to reuse a stored Square customer + card-on-file (`ccof:` prefix) instead of creating new ones. Updates `profiles` with `subscription_id`, `subscription_status`, `subscription_plan_id`, `next_billing_date`.
- `square-webhook/` — receives Square webhook events. Verifies HMAC-SHA256 signature using `SQUARE_WEBHOOK_SIGNATURE_KEY` + `SQUARE_WEBHOOK_URL` env vars. Handles: `subscription.updated` (status changes, cancellation scheduling), `invoice.scheduled_charge_failed` (marks `past_due`), `invoice.payment_made` (marks `active`). Requires `SQUARE_WEBHOOK_SIGNATURE_KEY` and `SQUARE_WEBHOOK_URL` secrets set in Supabase.

**Square environment:** Production. Secrets set in Supabase: `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_ENV=production`, `SQUARE_WEBHOOK_SIGNATURE_KEY`, `SQUARE_WEBHOOK_URL`.

**Saved-card flow** (`src/services/cardService.js`):
- `getSavedCard(userId)` — reads `square_customer_id` / `square_card_id` from `profiles`
- `saveCard({ userId, token, email, displayName })` → invokes `save-card` Edge Function → returns `{ squareCardId, squareCustomerId, cardLast4, cardBrand }`
- `chargeCardOnFile({ userId, squareCustomerId, cardId, amountCents, … })` → invokes `square-payment` with stored card credentials
- `SessionPaymentGate` (`src/components/ui/SessionPaymentGate.jsx`) orchestrates the full reservation-time payment UX: checks if payment is required, shows saved card or Square card entry form, then calls `onPaymentComplete(paymentId | null)`. Accepts `onPaymentFailed` prop — called on any payment error so the caller can release seats and reset UI. Uses `useRef` (not `useState`) for double-tap guard to avoid re-render races. Shows a "Cancel 24+ hours before the session for a full refund" notice above both Pay buttons.

**Cancellation and refund flow:**
- `checkCancellationEligibility(reservationId, userId)` in `cancellationService.js` calls the `get_cancellation_eligibility` Supabase RPC — returns `{ eligible, refundable, refund_amount, square_payment_id, hours_until, … }`
- `cancelReservation({ reservationId, groupId, cancelWholeGroup, userId })` in `cancellationService.js` — delegates to `cancel_reservation_with_refund` RPC (`p_is_employee: false`) which handles seat release server-side; group cancellations iterate each reservation through the same RPC
- `processRefund({ squarePaymentId, amountCents })` in `cancellationService.js` — invokes the `square-refund` Edge Function, forwarding the user's Supabase auth token
- `CancelReservationModal` (`src/components/ui/CancelReservationModal.jsx`) — seat checkbox list with per-seat eligibility. Shows a front-counter refund notice when cancelling guest seats only (primary not selected) outside the 24-hour window. Selecting the primary seat auto-selects all guest seats (guests can't attend without the member).
- Cancellation window: **24 hours** before session start. Cancellations within this window are not refundable.
- `get_cancellation_eligibility` RPC SQL is documented in the comment block at the top of `cancellationService.js`. `cancel_reservation_with_refund` and `link_payment_to_reservation` RPCs are **not** in the codebase — they must be created separately in the Supabase SQL editor.
- The `payments` table requires three columns added via SQL: `square_refund_id TEXT`, `refunded_at TIMESTAMPTZ`, `refunded_by UUID REFERENCES auth.users(id)`.

**Password reset flow:**
- `/forgot-password` is wrapped in `PublicOnlyRoute`
- `/reset-password` is NOT wrapped — email recovery links create a temporary Supabase session, so the user is technically "logged in" when they land. After a successful reset, `supabase.auth.signOut()` is called to clear the temporary session before redirecting to `/login`.

**Database schema (key tables):**
- `profiles` — extends `auth.users`; `role`, `membership_type`, `is_active`, `member_number`, `square_customer_id`, `square_card_id`, `subscription_id`, `subscription_status`, `subscription_plan_id`, `next_billing_date`, `subscription_cancel_at`
- `sessions` — `date`, `start_time`, `end_time`, `total_seats`, `status`
- `seats` — `session_id`, `seat_number`, `status` (available/reserved/occupied)
- `reservations` — `user_id`, `session_id`, `seat_id`, `status` (confirmed/checked_in/no_show/cancelled/walk_in), `is_flagged_overage`, `is_walk_in`, `is_primary_seat` (true for the member's own seat, false for extra/guest seats), `membership_type_at_booking`, `override_by`, `override_at`, `group_reservation_id`
- `payments` — `user_id`, `amount_cents`, `status` (pending/completed/refunded), `square_payment_id`, `square_refund_id`, `refunded_at`, `refunded_by`, `reference_id` (reservation UUID)
- `buddy_passes` — `owner_id`, `code`, `used_count`, `max_uses`, month-scoped
- `events` / `event_rsvps` — event listings and RSVP tracking

`seed.sql` in the repo root seeds Supabase with 5 test users (password: `password123`): 4 four_winds_members and 1 employee (`employee@mahjongstore.com`).

`pre_production_cutover_backup.sql` in the repo root is a pre-launch database snapshot — do not delete it.

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
