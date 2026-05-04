import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const body = await req.json()
  const { userId, token, email, displayName } = body

  const squareBase = Deno.env.get('SQUARE_ENV') === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com'

  const squareHeaders = {
    'Square-Version': '2024-01-18',
    'Authorization': `Bearer ${Deno.env.get('SQUARE_ACCESS_TOKEN')}`,
    'Content-Type': 'application/json',
  }

  // 1. Get existing square_customer_id or create new customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('square_customer_id')
    .eq('id', userId)
    .single()

  let squareCustomerId = profile?.square_customer_id

  if (!squareCustomerId) {
    // Split displayName into first/last for Square API
    const nameParts  = (displayName ?? '').trim().split(' ')
    const given_name  = nameParts[0] ?? ''
    const family_name = nameParts.slice(1).join(' ') ?? ''

    const createCustomerRes = await fetch(
      `${squareBase}/v2/customers`,
      {
        method: 'POST',
        headers: squareHeaders,
        body: JSON.stringify({
          email_address: email,
          given_name,
          family_name,
          idempotency_key: `cust-${userId.slice(0, 8)}`
        })
      }
    )
    const customerData = await createCustomerRes.json()
    if (!customerData.customer) {
      console.error('[save-card] failed to create customer:', customerData)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create Square customer' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    squareCustomerId = customerData.customer.id

    await supabase
      .from('profiles')
      .update({ square_customer_id: squareCustomerId })
      .eq('id', userId)
  }

  // 2. Save card to customer
  const saveCardRes = await fetch(
    `${squareBase}/v2/cards`,
    {
      method: 'POST',
      headers: squareHeaders,
      body: JSON.stringify({
        // First 8 chars of userId + last 8 digits of timestamp = 22 chars total
        idempotency_key: `card-${userId.slice(0, 8)}-${Date.now().toString().slice(-8)}`,
        source_id: token,
        card: { customer_id: squareCustomerId }
      })
    }
  )
  const cardData = await saveCardRes.json()

  if (!cardData.card) {
    console.error('[save-card] failed to save card:', cardData)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to save card' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const squareCardId = cardData.card.id
  const cardLast4 = cardData.card.last_4
  const cardBrand = cardData.card.card_brand

  // 3. Save card ID to profile
  await supabase
    .from('profiles')
    .update({ square_card_id: squareCardId })
    .eq('id', userId)

  console.log('[save-card] card saved for user', userId, '| card:', squareCardId)

  return new Response(
    JSON.stringify({
      success: true,
      squareCardId,
      squareCustomerId,
      cardLast4,
      cardBrand
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
