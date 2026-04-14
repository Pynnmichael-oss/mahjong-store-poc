import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      sourceId,
      amountCents,
      description = 'Four Winds payment',
      userId,
      reservationId,
      membershipType,
    } = await req.json()

    if (!sourceId || !amountCents) {
      throw new Error('sourceId and amountCents are required')
    }

    const accessToken  = Deno.env.get('SQUARE_ACCESS_TOKEN')
    const locationId   = Deno.env.get('SQUARE_LOCATION_ID')
    const squareBase   = Deno.env.get('SQUARE_ENV') === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

    if (!accessToken || !locationId) {
      throw new Error('Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID env var')
    }

    // Idempotency key — unique per request
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

    // Insert payment record using service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, serviceKey)

    const { data: paymentRow, error: dbError } = await db
      .from('payments')
      .insert({
        user_id: userId ?? null,
        reservation_id: reservationId ?? null,
        square_payment_id: squarePaymentId,
        amount_cents: amountCents,
        currency: 'USD',
        description,
        membership_type: membershipType ?? null,
        status: 'completed',
      })
      .select('id')
      .single()

    if (dbError) {
      console.warn('[square-payment] DB insert failed (non-fatal):', dbError.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentRow?.id ?? null,
        squarePaymentId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[square-payment] error:', err instanceof Error ? err.message : String(err))
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
