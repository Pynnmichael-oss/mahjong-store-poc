import { getMembershipConfig, SESSION_WALK_IN_RATE_CENTS, GUEST_SEAT_RATE_CENTS } from './businessRules.js'

export function calculateBookingCost({ membershipType, seatCount, weeklySessionsUsed = 0 }) {
  if (!seatCount || seatCount === 0) {
    return { ownSeatCost: 0, guestSeatCost: 0, totalCents: 0, extraSeats: 0, isFree: true, isOverage: false }
  }

  const config     = getMembershipConfig(membershipType)
  const extraSeats = seatCount - 1

  let ownSeatCost = 0
  if (membershipType === 'dragon_pass') {
    ownSeatCost = 0
  } else if (config.weeklyLimit !== null) {
    // flower_pass or bamboo_pass — free within weekly limit, $15 overage
    ownSeatCost = weeklySessionsUsed >= config.weeklyLimit ? SESSION_WALK_IN_RATE_CENTS : 0
  } else {
    // four_winds_member — always pays
    ownSeatCost = SESSION_WALK_IN_RATE_CENTS
  }

  // Guest seats always $15 except dragon_pass (buddy passes are free)
  const guestSeatCost = membershipType === 'dragon_pass'
    ? 0
    : extraSeats * GUEST_SEAT_RATE_CENTS

  const totalCents = ownSeatCost + guestSeatCost
  const isOverage  = config.weeklyLimit !== null && weeklySessionsUsed >= config.weeklyLimit

  return { ownSeatCost, guestSeatCost, totalCents, extraSeats, isFree: totalCents === 0, isOverage }
}
