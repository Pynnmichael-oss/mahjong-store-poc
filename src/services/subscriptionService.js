import { supabase } from './supabase.js'

const PLAN_VARIATION_IDS = {
  dragon_pass:     'OLMGLGNESDB2LNOOACKJLB3S',
  flower_pass:     'EMTGGV4RRQAIHZ5ZYC6WWRX4',
  bamboo_pass:     'IHNAVMMGCZCZIOP75MINXF5Z',
  founding_member: 'XSEGNYO36QFU6PLVQLQ5FSIN',
}

export function getPlanVariationId(membershipType) {
  return PLAN_VARIATION_IDS[membershipType] ?? null
}

export async function createSubscription({ planVariationId, membershipType, cardToken, email, displayName }) {
  const { data: { session: authSession } } = await supabase.auth.getSession()
  const { data, error } = await supabase.functions.invoke('create-subscription', {
    body: { planVariationId, membershipType, cardToken, email, displayName },
    headers: authSession?.access_token
      ? { Authorization: `Bearer ${authSession.access_token}` }
      : {},
  })
  if (error) throw new Error(error.message ?? 'Subscription creation failed')
  if (!data?.success) throw new Error(data?.error ?? 'Subscription creation failed')
  return data
}

export async function cancelSubscription({ subscriptionId }) {
  const { data: { session: authSession } } = await supabase.auth.getSession()
  const { data, error } = await supabase.functions.invoke('cancel-subscription', {
    body: { subscriptionId },
    headers: authSession?.access_token
      ? { Authorization: `Bearer ${authSession.access_token}` }
      : {},
  })
  if (error) throw new Error(error.message ?? 'Subscription cancellation failed')
  if (!data?.success) throw new Error(data?.error ?? 'Subscription cancellation failed')
  return data
}

export async function changeSubscription({ userId, oldSubscriptionId, newPlanVariationId, newMembershipType, squareCustomerId, squareCardId, email, displayName }) {
  // Cancel old subscription
  if (oldSubscriptionId) {
    await cancelSubscription({ subscriptionId: oldSubscriptionId })
  }

  // Create new subscription using existing card on file
  // The create-subscription Edge Function accepts either a fresh cardToken or
  // an existing card on file. We pass the existing card_id as cardToken so the
  // Edge Function reuses the saved card instead of creating a new one.
  const { data: { session: authSession } } = await supabase.auth.getSession()
  const { data, error } = await supabase.functions.invoke('create-subscription', {
    body: {
      planVariationId:    newPlanVariationId,
      membershipType:     newMembershipType,
      cardToken:          squareCardId,     // existing card on file
      existingCustomerId: squareCustomerId, // tells Edge Function to skip customer creation
      email,
      displayName,
    },
    headers: authSession?.access_token
      ? { Authorization: `Bearer ${authSession.access_token}` }
      : {},
  })
  if (error) throw new Error(error.message ?? 'Plan change failed')
  if (!data?.success) throw new Error(data?.error ?? 'Plan change failed')
  return data
}
