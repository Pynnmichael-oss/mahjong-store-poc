import { getWeekBoundaries, nowInChicago } from './dateUtils.js'

export { getWeekBoundaries }

// ─── Seat / table helpers ─────────────────────────────────────────────────────

export const TABLE_NAMES = [
  'Table 1', 'Table 2', 'Table 3', 'Table 4',
  'Table 5', 'Table 6', 'Table 7', 'Table 8',
]

export function getTableForSeat(seatNumber) {
  const tableIndex    = Math.floor((seatNumber - 1) / 4)
  const seatPosition  = ((seatNumber - 1) % 4)
  return { tableName: TABLE_NAMES[tableIndex], tableIndex, seatPosition }
}

export function countCheckedInPlaysThisWeek(reservations) {
  const { weekStart, weekEnd } = getWeekBoundaries()
  return reservations.filter(r => {
    if (r.status !== 'checked_in') return false
    const date = r.sessions?.date
      ? new Date(r.sessions.date + 'T00:00:00')
      : new Date(r.reserved_at)
    return date >= weekStart && date <= weekEnd
  }).length
}

// ─── Membership config ────────────────────────────────────────────────────────

export const MEMBERSHIP_CONFIG = {
  dragon_pass: {
    label:           'Dragon Pass',
    price:           '$149.99/mo',
    description:     'Unlimited access + buddy passes',
    color:           'gold',
    weeklyLimit:     null,
    monthlyLimit:    null,
    buddyPasses:     2,
    saturdayBlocked: false,
    saturdayWarning: false,
    earlyEvents:     true,
    eventDiscount:   0.15,
  },
  flower_pass: {
    label:           'Flower Pass',
    price:           '$89.99/mo',
    description:     '8 sessions per month',
    color:           'teal',
    weeklyLimit:     null,
    monthlyLimit:    8,
    buddyPasses:     0,
    saturdayBlocked: false,
    saturdayWarning: true,
    earlyEvents:     false,
    eventDiscount:   0,
  },
  four_winds_member: {
    label:           'Four Winds Member',
    price:           'Free',
    description:     'Walk-in price per session',
    color:           'navy',
    weeklyLimit:     null,
    monthlyLimit:    null,
    buddyPasses:     0,
    saturdayBlocked: false,
    saturdayWarning: false,
    earlyEvents:     false,
    eventDiscount:   0,
  },
  walk_in: {
    label:           'Walk-in',
    price:           'Per session',
    description:     'Pay per session',
    color:           'sand',
    weeklyLimit:     null,
    monthlyLimit:    null,
    buddyPasses:     0,
    saturdayBlocked: false,
    saturdayWarning: false,
    earlyEvents:     false,
    eventDiscount:   0,
  },
  subscriber: {
    label:           'Subscriber',
    price:           '',
    description:     '3 plays per week',
    color:           'navy',
    weeklyLimit:     3,
    monthlyLimit:    null,
    buddyPasses:     0,
    saturdayBlocked: false,
    saturdayWarning: false,
    earlyEvents:     false,
    eventDiscount:   0,
  },
}

export function getMembershipConfig(type) {
  return MEMBERSHIP_CONFIG[type] ?? MEMBERSHIP_CONFIG['walk_in']
}

export function getMembershipLabel(type) {
  return getMembershipConfig(type).label
}

export function getMembershipDescription(type) {
  return getMembershipConfig(type).description
}

// Returns Tailwind classes for the membership badge pill
export function getMembershipBadgeClasses(type) {
  const map = {
    dragon_pass:       'bg-gold text-navy',
    flower_pass:       'bg-teal-100 text-teal-800 border border-teal-200',
    four_winds_member: 'bg-navy text-sky',
    walk_in:           'bg-cream text-navy border border-navy/20',
    subscriber:        'bg-navy text-sky',
    unlimited:         'bg-gold-light text-navy border border-gold/30',
  }
  return map[type] ?? map.walk_in
}

// Backward-compat shim — keeps old field names working for files not yet migrated
// Also preserves the legacy `unlimited` type so existing DB rows don't break
export const MEMBERSHIP_TIERS = {
  ...Object.fromEntries(
    Object.entries(MEMBERSHIP_CONFIG).map(([k, v]) => [k, {
      ...v,
      key:        k,
      name:       v.label,
      priceLabel: v.price,
      tagline:    v.description,
    }])
  ),
  unlimited: {
    key: 'unlimited', name: 'Dragon Pass (legacy)', label: 'Dragon Pass (legacy)',
    priceLabel: '$100/mo', price: '$100/mo',
    tagline: 'Unlimited play, anytime', description: 'Unlimited play, anytime',
    weeklyLimit: null, monthlyLimit: null, buddyPasses: 0,
    saturdayBlocked: false, saturdayWarning: false,
  },
}

// ─── Membership predicates ────────────────────────────────────────────────────

export function isBuddyPassEligible(membershipType) {
  return getMembershipConfig(membershipType).buddyPasses > 0
}

export function hasSaturdayWarning(membershipType) {
  return getMembershipConfig(membershipType).saturdayWarning === true
}

export function hasMonthlyLimit(membershipType) {
  return getMembershipConfig(membershipType).monthlyLimit !== null
}

export function getMonthlyLimit(membershipType) {
  return getMembershipConfig(membershipType).monthlyLimit
}

export function shouldFlagOverage(membershipType, weeklyCount) {
  const config = getMembershipConfig(membershipType)
  if (!config.weeklyLimit) return false
  return weeklyCount >= config.weeklyLimit
}

export function shouldWarnMonthlyLimit(membershipType, monthlyCount) {
  const config = getMembershipConfig(membershipType)
  if (!config.monthlyLimit) return false
  return monthlyCount >= config.monthlyLimit
}

export function hasEarlyEventAccess(membershipType) {
  return getMembershipConfig(membershipType).earlyEvents === true
}

// ─── Session / reservation helpers ───────────────────────────────────────────

export function isWithinCheckinWindow(session) {
  const now = nowInChicago()
  const sessionStart = new Date(`${session.date}T${session.start_time}`)
  const windowEnd = new Date(sessionStart.getTime() + 15 * 60 * 1000)
  return now >= sessionStart && now <= windowEnd
}

export function buildReservationPayload({ userId, sessionId, seatId, membershipType, isFlaggedOverage, isWalkIn = false }) {
  return {
    user_id: userId,
    session_id: sessionId,
    seat_id: seatId,
    membership_type_at_booking: membershipType,
    is_flagged_overage: isFlaggedOverage,
    is_walk_in: isWalkIn,
    status: isWalkIn ? 'walk_in' : 'confirmed',
    checked_in_at: isWalkIn ? new Date().toISOString() : null,
    reserved_at: new Date().toISOString(),
  }
}

export function getEventRsvpStatus(confirmedCount, capacity) {
  return confirmedCount < capacity ? 'confirmed' : 'waitlisted'
}

// ─── Buddy pass helpers ───────────────────────────────────────────────────────

export function getBuddyPassMonth() {
  const now = nowInChicago()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function getPassResetDate() {
  const now = nowInChicago()
  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return firstOfNextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}
