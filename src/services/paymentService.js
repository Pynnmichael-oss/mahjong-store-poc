import { supabase } from './supabase.js'

/**
 * Charge a card via the Square Edge Function.
 *
 * @param {object} params
 * @param {string} params.sourceId       - Token from Square card.tokenize()
 * @param {number} params.amountCents    - Amount in cents (e.g. 14999 for $149.99)
 * @param {string} params.description    - Payment description shown in Square dashboard
 * @param {string} [params.userId]       - Supabase user ID (for payment record)
 * @param {string} [params.reservationId] - Reservation ID (for walk-in / overage payments)
 * @param {string} [params.membershipType] - e.g. 'dragon_pass' (for subscription payments)
 * @returns {{ paymentId: string, squarePaymentId: string }}
 */
export async function chargeCard({ sourceId, amountCents, description, userId, reservationId, membershipType }) {
  const { data: { session } } = await supabase.auth.getSession()

  const { data, error } = await supabase.functions.invoke('square-payment', {
    body: { sourceId, amountCents, description, userId, reservationId, membershipType },
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
  })

  if (error) {
    console.error('[paymentService] invoke error:', error)
    throw new Error(error.message ?? 'Payment failed')
  }
  if (!data?.success) throw new Error(data?.error ?? 'Payment failed')

  return { paymentId: data.paymentId, squarePaymentId: data.squarePaymentId }
}
