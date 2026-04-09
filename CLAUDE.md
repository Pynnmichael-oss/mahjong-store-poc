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
- **Membership tiers:** `walk_in` ($20/session), `subscriber`/Wind Pass ($50/mo, 3 sessions/week), `unlimited`/Dragon Pass ($100/mo, no limit)
- Weekly session count uses Mon–Sun boundaries in America/Chicago timezone (`src/lib/dateUtils.js`)
- Overage flagging: subscribers who've already used 3 sessions get `is_flagged_overage = true`
- Check-in window: 15 minutes from session start time
- Seats are grouped into 5 named tables (East, South, West, North, Center), 8 seats each — `getTableForSeat(seatNumber)` maps seat numbers to tables

**Database schema (key tables):**
- `profiles` — extends `auth.users`; `role`, `membership_type`, `is_active`
- `sessions` — `date`, `start_time`, `end_time`, `total_seats`, `status`
- `seats` — `session_id`, `seat_number`, `status` (available/reserved/occupied)
- `reservations` — `user_id`, `session_id`, `seat_id`, `status` (confirmed/checked_in/no_show/cancelled/walk_in), `is_flagged_overage`, `is_walk_in`
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
