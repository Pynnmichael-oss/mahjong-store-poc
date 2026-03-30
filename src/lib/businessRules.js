import { getWeekBoundaries, nowInChicago } from './dateUtils.js'

/** Returns { weekStart, weekEnd } in America/Chicago */
export { getWeekBoundaries }

/**
 * Count checked_in reservations for a user this week.
 * @param {Array} reservations - reservations with status and session.date
 */
export function countCheckedInPlaysThisWeek(reservations) {
  const { weekStart, weekEnd } = getWeekBoundaries()
  return reservations.filter(r => {
    if (r.status !== 'checked_in') return false
    // Use the session date or reserved_at to determine week
    const date = r.sessions?.date
      ? new Date(r.sessions.date + 'T00:00:00')
      : new Date(r.reserved_at)
    return date >= weekStart && date <= weekEnd
  }).length
}

/**
 * Should we flag this reservation as an overage?
 * @param {string} membershipType - 'subscriber' | 'walk_in'
 * @param {number} checkedInCount - current checked_in count this week
 */
export function shouldFlagOverage(membershipType, checkedInCount) {
  if (membershipType !== 'subscriber') return false
  return checkedInCount >= 3
}

/**
 * Is the current time within the valid check-in window?
 * Window: session start_time up to start_time + 15 minutes
 * @param {Object} session - { date, start_time }
 */
export function isWithinCheckinWindow(session) {
  const now = nowInChicago()
  const sessionStart = new Date(`${session.date}T${session.start_time}`)
  const windowEnd = new Date(sessionStart.getTime() + 15 * 60 * 1000)
  return now >= sessionStart && now <= windowEnd
}

/**
 * Build the reservation insert payload.
 * @param {Object} params
 */
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
