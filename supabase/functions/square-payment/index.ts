import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Required Supabase SQL before deploying:
//
// CREATE TABLE IF NOT EXISTS payments (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id UUID REFERENCES auth.users(id),
//   reservation_id UUID REFERENCES reservations(id),
//   square_payment_id TEXT UNIQUE,
//   amount_cents INTEGER NOT NULL,
//   currency TEXT NOT NULL DEFAULT 'USD',
//   description TEXT,
//   membership_type TEXT,
//   status TEXT NOT NULL DEFAULT 'completed',
//   created_at TIMESTAMPTZ DEFAULT now()
// );
// ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "employees can view payments" ON payments FOR SELECT USING (true);

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

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const {
      token,
      cardId,
      squareCustomerId,
      amountCents,
      description = 'Four Winds payment',
      userId,
      reservationId,
      membershipType,
      paymentType,
    } = await req.json()

    // Support both a fresh token and a saved card on file
    const sourceId = token ?? cardId

    console.log('[square-payment] userId received:', userId)
    console.log('[square-payment] paymentType:', paymentType)
    console.log('[square-payment] membershipType:', membershipType)

    if (!sourceId || !amountCents) {
      throw new Error('A payment token or saved cardId, plus amountCents, are required')
    }

    const accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN')
    const locationId  = Deno.env.get('SQUARE_LOCATION_ID')
    const squareBase  = Deno.env.get('SQUARE_ENV') === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

    if (!accessToken || !locationId) {
      throw new Error('Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID env var')
    }

    const idempotencyKey = crypto.randomUUID()

    console.log(`[square-payment] charging ${amountCents} cents, sourceId: ${sourceId.slice(0, 12)}...`)

    const squareRes = await fetch(`${squareBase}/v2/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: idempotencyKey,
        location_id: locationId,
        ...(squareCustomerId ? { customer_id: squareCustomerId } : {}),
        amount_money: {
          amount: amountCents,
          currency: 'USD',
        },
        note: description,
      }),
    })

    const squareData = await squareRes.json()
    console.log(`[square-payment] Square response status: ${squareRes.status}`)

    if (!squareRes.ok) {
      const errDetail = squareData?.errors?.[0]?.detail ?? squareData?.errors?.[0]?.code ?? 'Square API error'
      throw new Error(errDetail)
    }

    const squarePaymentId = squareData.payment?.id
    console.log(`[square-payment] Square payment ID: ${squarePaymentId}`)

    // Post-charge DB writes — use service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, serviceKey)

    // Insert payment record — errors are logged but never thrown (don't block the response)
    let paymentRow: { id: string } | null = null
    try {
      const { data, error: dbError } = await db
        .from('payments')
        .insert({
          user_id: userId ?? null,
          reference_id: reservationId ?? null,
          square_payment_id: squarePaymentId,
          square_order_id: squareData.payment?.order_id ?? null,
          amount_cents: amountCents,
          currency: 'USD',
          description,
          membership_type: membershipType ?? null,
          payment_type: paymentType ?? (membershipType ? 'membership' : 'session'),
          status: 'completed',
          metadata: reservationId ? { reservation_id: reservationId } : null,
        })
        .select('id')
        .single()

      if (dbError) {
        console.error('[square-payment] payments insert failed:', dbError.message, dbError.code, dbError.details)
      } else {
        paymentRow = data
        console.log('[square-payment] payment record inserted:', paymentRow?.id)
      }
    } catch (insertErr) {
      console.error('[square-payment] payments insert threw:', insertErr instanceof Error ? insertErr.message : String(insertErr))
    }

    // Update membership_type and membership_paid_until on the user's profile
    if (userId && membershipType) {
      const paidUntil = new Date()
      paidUntil.setMonth(paidUntil.getMonth() + 1)

      console.log('[square-payment] updating profile — userId:', userId, 'membershipType:', membershipType)

      const { error: profileError } = await db
        .from('profiles')
        .update({
          membership_type: membershipType,
          membership_paid_until: paidUntil.toISOString(),
        })
        .eq('id', userId)

      if (profileError) {
        console.error('[square-payment] profile update failed:', profileError.message)
      } else {
        console.log('[square-payment] membership updated to:', membershipType)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentRow?.id ?? null,
        squarePaymentId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[square-payment] error:', err instanceof Error ? err.message : String(err))
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
