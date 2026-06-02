import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function verifyAuth(req: Request): Promise<{ userId: string; role: string }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header')
  }
  const jwt = authHeader.replace('Bearer ', '')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } }
  })
  const { data: { user }, error } = await authClient.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return { userId: user.id, role: profile?.role ?? 'customer' }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, ' +
    'x-supabase-client, accept, accept-language',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  let authedUserId: string
  try {
    const auth = await verifyAuth(req)
    authedUserId = auth.userId
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { planVariationId, membershipType, cardToken, email, displayName, existingCustomerId } = await req.json()

    if (!planVariationId || !membershipType || !cardToken || !email || !displayName) {
      throw new Error('planVariationId, membershipType, cardToken, email, and displayName are required')
    }

    const accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN')
    const locationId  = Deno.env.get('SQUARE_LOCATION_ID')
    const squareBase  = Deno.env.get('SQUARE_ENV') === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

    if (!accessToken || !locationId) {
      throw new Error('Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID env var')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, serviceKey)

    // 1. Check for existing Square customer
    let customerId: string

    if (existingCustomerId) {
      customerId = existingCustomerId
    } else {
      const { data: profileRow, error: profileReadError } = await db
        .from('profiles')
        .select('square_customer_id')
        .eq('id', authedUserId)
        .single()

      if (profileReadError) throw new Error(`Failed to read profile: ${profileReadError.message}`)

      customerId = profileRow?.square_customer_id ?? ''

      if (!customerId) {
        // Create Square customer
        const customerRes = await fetch(`${squareBase}/v2/customers`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Square-Version': '2024-01-18',
          },
          body: JSON.stringify({
            email_address: email,
            given_name: displayName,
            idempotency_key: crypto.randomUUID(),
          }),
        })
        const customerData = await customerRes.json()
        if (!customerRes.ok) {
          const detail = customerData?.errors?.[0]?.detail ?? customerData?.errors?.[0]?.code ?? 'Square customer creation failed'
          throw new Error(detail)
        }
        customerId = customerData.customer?.id
        if (!customerId) throw new Error('Square did not return a customer id')
      }
    }

    // 2. Create card on file (skip if reusing an existing card-on-file id)
    let cardId: string

    if (existingCustomerId && cardToken.startsWith('ccof:')) {
      cardId = cardToken
    } else {
      const cardRes = await fetch(`${squareBase}/v2/cards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2024-01-18',
        },
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          source_id: cardToken,
          card: { customer_id: customerId },
        }),
      })
      const cardData = await cardRes.json()
      if (!cardRes.ok) {
        const detail = cardData?.errors?.[0]?.detail ?? cardData?.errors?.[0]?.code ?? 'Square card creation failed'
        throw new Error(detail)
      }
      cardId = cardData.card?.id
      if (!cardId) throw new Error('Square did not return a card id')
    }

    // 3. Create subscription
    const now = new Date()
    const today = now.toISOString().slice(0, 10) // YYYY-MM-DD

    const subRes = await fetch(`${squareBase}/v2/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        location_id: locationId,
        plan_variation_id: planVariationId,
        customer_id: customerId,
        card_id: cardId,
        start_date: today,
      }),
    })
    const subData = await subRes.json()
    if (!subRes.ok) {
      const detail = subData?.errors?.[0]?.detail ?? subData?.errors?.[0]?.code ?? 'Square subscription creation failed'
      throw new Error(detail)
    }
    const subscription = subData.subscription
    if (!subscription?.id) throw new Error('Square did not return a subscription id')

    // 4. Compute next billing date (same day next month)
    const nextBilling = new Date(now)
    nextBilling.setMonth(nextBilling.getMonth() + 1)
    const nextBillingDate = nextBilling.toISOString().slice(0, 10)

    // 5. Update profile
    const profileFields: Record<string, unknown> = {
      membership_type: membershipType,
      subscription_id: subscription.id,
      subscription_status: 'active',
      subscription_plan_id: planVariationId,
      next_billing_date: nextBillingDate,
    }
    if (!existingCustomerId) {
      profileFields.square_customer_id = customerId
      profileFields.square_card_id = cardId
    }
    const { error: profileUpdateError } = await db
      .from('profiles')
      .update(profileFields)
      .eq('id', authedUserId)

    if (profileUpdateError) {
      throw new Error(`Profile update failed: ${profileUpdateError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, subscriptionId: subscription.id, nextBillingDate }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[create-subscription] error:', err instanceof Error ? err.message : String(err))
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
