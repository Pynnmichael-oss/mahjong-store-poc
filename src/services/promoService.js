import { supabase } from './supabase.js'

/**
 * Buy the one-time Black Friday Special: $357 for 6 months of Dragon Pass.
 *
 * The amount is NOT sent — it is a server constant in purchase-bf-special.
 * Pass a freshly tokenised card, or omit `token` to charge the card on file.
 *
 * `accessToken` is only needed during signup, where the account was created
 * moments earlier: pass the session token explicitly so the call cannot race
 * the client picking up its new session. Elsewhere, omit it and supabase-js
 * attaches the current session itself.
 *
 * @param {{ token?: string, accessToken?: string }} args
 * @returns {Promise<{ paymentId: string|null, squarePaymentId: string, membershipType: string, membershipExpiresAt: string }>}
 */
export async function purchaseBlackFridaySpecial({ token, accessToken } = {}) {
  const { data, error } = await supabase.functions.invoke('purchase-bf-special', {
    body: token ? { token } : {},
    ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
  })

  if (error) {
    // Unlike the other Edge Functions here, purchase-bf-special answers with
    // real 4xx/5xx codes, so supabase-js raises a FunctionsHttpError whose
    // message is only "Edge Function returned a non-2xx status code" — the
    // actual reason (window closed, already purchased, card declined) is in the
    // response body. Recover it so the customer sees something useful.
    let message = error.message ?? 'Purchase failed'
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch {
      // Body unreadable — fall back to the generic message.
    }
    throw new Error(message)
  }

  if (!data?.success) throw new Error(data?.error ?? 'Purchase failed')
  return data
}
