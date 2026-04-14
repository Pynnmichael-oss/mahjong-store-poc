import { getWeekBoundaries, nowInChicago } from './dateUtils.js'

export { getWeekBoundaries }

export const TABLE_NAMES = [
  'Table 1', 'Table 2', 'Table 3', 'Table 4',
  'Table 5', 'Table 6', 'Table 7', 'Table 8',
]

export function getTableForSeat(seatNumber) {
  const tableIndex = Math.floor((seatNumber - 1) / 4)
  const seatPosition = ((seatNumber - 1) % 4)
  return {
    tableName: TABLE_NAMES[tableIndex],
    tableIndex,
    seatPosition,
  }
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

// Membership tier definitions
export const MEMBERSHIP_TIERS = {
  unlimited: {
    key: 'unlimited',
    name: 'Dragon Pass',
    tagline: 'Unlimited play, anytime',
    price: 100,
    priceLabel: '$100 / month',
    weeklyLimit: null,
    color: 'navy',
  },
  subscriber: {
    key: 'subscriber',
    name: 'Wind Pass',
    tagline: '3 sessions per week',
    price: 50,
    priceLabel: '$50 / month',
    weeklyLimit: 3,
    color: 'teal',
  },
  walk_in: {
    key: 'walk_in',
    name: 'Bamboo',
    tagline: 'Drop in anytime — pay per session',
    price: 20,
    priceLabel: '$20 / session',
    weeklyLimit: null,
    color: 'muted',
  },
}

export function shouldFlagOverage(membershipType, checkedInCount) {
  // Only Wind Pass (subscriber) has a weekly limit
  if (membershipType !== 'subscriber') return false
  return checkedInCount >= 3
}

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

export function isBuddyPassEligible(membershipType) {
  return membershipType === 'subscriber'
}

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
