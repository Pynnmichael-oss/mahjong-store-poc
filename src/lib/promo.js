// Black Friday Special — client-side promo window.
//
// This gate is COSMETIC: it decides whether to show the offer. The real rules
// live in the purchase-bf-special Edge Function, which re-checks the window,
// the feature flag and every eligibility condition server-side. Never treat a
// passing check here as authorisation.

const RAW_ENABLED = import.meta.env.VITE_PROMO_BF_ENABLED
const RAW_STARTS  = import.meta.env.VITE_PROMO_STARTS_AT
const RAW_ENDS    = import.meta.env.VITE_PROMO_ENDS_AT

export const PROMO_BF_ENABLED = RAW_ENABLED === 'true'

export const PROMO_BF_PRICE_LABEL = '$357'
export const PROMO_BF_COPY =
  'Black Friday Special: 6 months of unlimited Dragon Pass for $357, paid once. ' +
  'Does not auto-renew. Available Nov 27 only.'

// True only when the flag is on AND now falls inside the configured window.
// Fails closed: a missing or unparseable window hides the offer.
export function isBlackFridayPromoOpen(now = new Date()) {
  if (!PROMO_BF_ENABLED) return false
  if (!RAW_STARTS || !RAW_ENDS) return false

  const startsAt = new Date(RAW_STARTS)
  const endsAt   = new Date(RAW_ENDS)
  if (isNaN(startsAt) || isNaN(endsAt)) return false

  return now >= startsAt && now <= endsAt
}

// Mirrors the server's reject list so we don't show an offer that is certain to
// fail. The server still enforces all of it.
export function isEligibleForBlackFridayPromo(profile) {
  if (!profile) return false
  if (profile.subscription_id) return false
  if (profile.membership_expires_at) return false
  if (profile.unlimited_free_booking) return false
  return true
}
