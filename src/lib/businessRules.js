import { getWeekBoundaries, getWeekBoundariesForDate, nowInChicago } from './dateUtils.js'

export { getWeekBoundaries }

export const SESSION_WALK_IN_RATE_CENTS = 1500  // $15.00
export const MAX_SEATS_PER_BOOKING      = 4
export const GUEST_SEAT_RATE_CENTS      = 1500  // $15 per guest seat

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
    if (!['confirmed', 'reserved', 'walk_in', 'checked_in'].includes(r.status)) return false
    const date = r.sessions?.date
      ? new Date(r.sessions.date + 'T00:00:00')
      : new Date(r.reserved_at)
    return date >= weekStart && date <= weekEnd
  }).length
}

export function countPlaysForSessionWeek(reservations, sessionDate) {
  // sessionDate: YYYY-MM-DD string — counts reservations in that session's Mon–Sun week
  const { weekStart, weekEnd } = sessionDate
    ? getWeekBoundariesForDate(sessionDate)
    : getWeekBoundaries()
  return reservations.filter(r => {
    if (!['confirmed', 'reserved', 'walk_in', 'checked_in'].includes(r.status)) return false
    if (!r.is_primary_seat) return false  // only count the member's own seat
    const date = r.sessions?.date
      ? new Date(r.sessions.date + 'T00:00:00')
      : new Date(r.reserved_at)
    return date >= weekStart && date <= weekEnd
  }).length
}

// ─── Membership config ────────────────────────────────────────────────────────

export const MEMBERSHIP_CONFIG = {
  dragon_pass: {
    label:          'Dragon Pass',
    price:          '$149.99/mo',
    priceCents:     14999,
    description:    'Unlimited sessions + 2 buddy passes',
    color:          'gold',
    weeklyLimit:    null,
    monthlyLimit:   null,
    buddyPasses:    2,
    earlyEvents:    true,
    eventDiscount:  0.15,
    requiresPaymentPerSession: false,
  },
  flower_pass: {
    label:          'Flower Pass',
    price:          '$79.99/mo',
    priceCents:     7999,
    description:    '2 sessions per week',
    color:          'sky',
    weeklyLimit:    2,
    monthlyLimit:   null,
    buddyPasses:    0,
    earlyEvents:    false,
    eventDiscount:  0,
    requiresPaymentPerSession: false,
  },
  bamboo_pass: {
    label:          'Bamboo Pass',
    price:          '$49.99/mo',
    priceCents:     4999,
    description:    '1 session per week',
    color:          'green',
    weeklyLimit:    1,
    monthlyLimit:   null,
    buddyPasses:    0,
    earlyEvents:    false,
    eventDiscount:  0,
    requiresPaymentPerSession: false,
  },
  four_winds_member: {
    label:          'Four Winds Member',
    price:          'Free account',
    priceCents:     0,
    description:    '$15 per session',
    color:          'navy',
    weeklyLimit:    null,
    monthlyLimit:   null,
    buddyPasses:    0,
    earlyEvents:    false,
    eventDiscount:  0,
    requiresPaymentPerSession: true,
  },
  founding_member: {
    label:          'Founding Member',
    price:          '$120/mo',
    priceCents:     12000,
    description:    'Charter member — unlimited play',
    color:          'gold',
    weeklyLimit:    null,
    monthlyLimit:   null,
    buddyPasses:    2,
    earlyEvents:    true,
    eventDiscount:  0.15,
    requiresPaymentPerSession: false,
  },
}

export function getMembershipConfig(type) {
  return MEMBERSHIP_CONFIG[type] ?? MEMBERSHIP_CONFIG['four_winds_member']
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
    flower_pass:       'bg-sky-light text-navy border border-sky-mid/30',
    bamboo_pass:       'bg-[#EAF3DE] text-[#27500A] border border-[#3B6D11]',
    four_winds_member: 'bg-navy text-sky',
    founding_member:   'bg-gold text-navy border-2 border-navy/20',
  }
  return map[type] ?? map.four_winds_member
}

// Backward-compat shim — keeps old field names working for files not yet migrated
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
}

// ─── Membership predicates ────────────────────────────────────────────────────

export function isBuddyPassEligible(membershipType) {
  return getMembershipConfig(membershipType).buddyPasses > 0
}

export function hasWeeklyLimit(membershipType) {
  return getMembershipConfig(membershipType).weeklyLimit !== null
}

export function getWeeklyLimit(membershipType) {
  return getMembershipConfig(membershipType).weeklyLimit
}

export function shouldFlagOverage(membershipType, weeklyCount) {
  const config = getMembershipConfig(membershipType)
  if (config.weeklyLimit === null) return false
  return weeklyCount >= config.weeklyLimit
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
