import { supabase } from './supabase.js'

// Get saved card info for a user
export async function getSavedCard(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('square_customer_id, square_card_id')
    .eq('id', userId)
    .single()
  return data
}

// Save a new card via the save-card Edge Function
export async function saveCard({ userId, token, email, displayName }) {
  const { data, error } = await supabase.functions.invoke('save-card', {
    body: { userId, token, email, displayName }
  })
  if (error) throw new Error(error.message)
  if (!data.success) throw new Error(data.error)
  return data  // { squareCardId, squareCustomerId, cardLast4, cardBrand }
}

// Charge saved card on file
export async function chargeCardOnFile({
  userId, squareCustomerId, cardId,
  amountCents, description, membershipType,
  paymentType, reservationId
}) {
  const { data, error } = await supabase.functions.invoke('square-payment', {
    body: {
      cardId,
      squareCustomerId,
      amountCents,
      description,
      userId,
      membershipType,
      paymentType: paymentType ?? 'session',
      reservationId: reservationId ?? null
    }
  })
  if (error) throw new Error(error.message)
  if (!data.success) throw new Error(data.error)
  return data  // { paymentId, squarePaymentId }
}
