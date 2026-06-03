import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, ' +
    'x-supabase-client, accept, accept-language, x-square-hmacsha256-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const ok = () =>
  new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const unauthorized = () =>
  new Response(JSON.stringify({ error: 'invalid signature' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// Square HMAC-SHA256 signature verification
async function verifySquareSignature(
  rawBody: string,
  signatureHeader: string | null,
  notificationUrl: string,
  signatureKey: string,
): Promise<boolean> {
  if (!signatureHeader || !signatureKey) return false

  const payload = notificationUrl + rawBody
  const enc = new TextEncoder()
  const keyData = enc.encode(signatureKey)
  const messageData = enc.encode(payload)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  // Convert to base64
  const computedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer)),
  )
  return computedSignature === signatureHeader
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  // Read raw body once (needed for signature verification AND parsing)
  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    console.error('[square-webhook] failed to read body')
    return unauthorized()
  }

  // Verify Square's HMAC signature
  const signatureKey = Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY')
  if (!signatureKey) {
    console.error('[square-webhook] SQUARE_WEBHOOK_SIGNATURE_KEY is not configured')
    return unauthorized()
  }

  const notificationUrl = Deno.env.get('SQUARE_WEBHOOK_URL') ?? req.url
  const signatureHeader = req.headers.get('x-square-hmacsha256-signature')

  const valid = await verifySquareSignature(rawBody, signatureHeader, notificationUrl, signatureKey)
  if (!valid) {
    console.warn('[square-webhook] signature verification FAILED — rejecting webhook')
    return unauthorized()
  }

  // Signature is valid — process the event
  try {
    const body = JSON.parse(rawBody)
    const eventType: string = body?.type ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, serviceKey)

    if (eventType === 'subscription.updated') {
      const subscription = body?.data?.object?.subscription
      const status: string = subscription?.status ?? ''
      const canceledDate: string | undefined = subscription?.canceled_date
      let updatePayload: Record<string, unknown>
      if (status === 'CANCELED' || status === 'DEACTIVATED') {
        updatePayload = { subscription_status: 'cancelled', subscription_cancel_at: null }
      } else if (canceledDate && status === 'ACTIVE') {
        updatePayload = { subscription_cancel_at: canceledDate }
      } else if (status === 'ACTIVE' && !canceledDate) {
        updatePayload = { subscription_status: 'active', subscription_cancel_at: null }
      } else {
        updatePayload = {}
      }
      if (Object.keys(updatePayload).length > 0) {
        const { error } = await db
          .from('profiles')
          .update(updatePayload)
          .eq('subscription_id', subscription.id)
        if (error) console.error('[square-webhook] subscription.updated DB error:', error.message)
      }
    } else if (eventType === 'invoice.scheduled_charge_failed') {
      const invoice = body?.data?.object?.invoice
      const { error } = await db
        .from('profiles')
        .update({ subscription_status: 'past_due' })
        .eq('subscription_id', invoice?.subscription_id)
      if (error) console.error('[square-webhook] invoice.payment_failed DB error:', error.message)
    } else if (eventType === 'invoice.payment_made') {
      const invoice = body?.data?.object?.invoice
      const { error } = await db
        .from('profiles')
        .update({ subscription_status: 'active' })
        .eq('subscription_id', invoice?.subscription_id)
      if (error) console.error('[square-webhook] invoice.payment_made DB error:', error.message)
    } else {
      console.log('[square-webhook] unhandled event type:', eventType)
    }
  } catch (err) {
    console.error('[square-webhook] error:', err instanceof Error ? err.message : String(err))
  }

  return ok()
})
