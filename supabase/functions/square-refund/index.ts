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

  try {
    const { squarePaymentId, amountCents, reason } = await req.json()

    if (!squarePaymentId || !amountCents) {
      throw new Error('squarePaymentId and amountCents are required')
    }

    const squareBase = Deno.env.get('SQUARE_ENV') === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

    const squareHeaders = {
      'Square-Version': '2024-01-18',
      'Authorization': `Bearer ${Deno.env.get('SQUARE_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
    }

    console.log('[square-refund] refunding payment:', squarePaymentId, 'amount:', amountCents)

    const refundRes = await fetch(`${squareBase}/v2/refunds`, {
      method: 'POST',
      headers: squareHeaders,
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        payment_id: squarePaymentId,
        amount_money: { amount: amountCents, currency: 'USD' },
        reason: reason ?? 'Customer cancellation',
      }),
    })

    const refundData = await refundRes.json()

    if (
      refundData.refund?.status === 'COMPLETED' ||
      refundData.refund?.status === 'PENDING'
    ) {
      await supabase
        .from('payments')
        .update({ status: 'refunded' })
        .eq('square_payment_id', squarePaymentId)

      console.log('[square-refund] refund successful:', refundData.refund.id)

      return new Response(
        JSON.stringify({
          success: true,
          refundId: refundData.refund.id,
          status: refundData.refund.status,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.error('[square-refund] failed:', refundData)
    return new Response(
      JSON.stringify({
        success: false,
        error: refundData.errors?.[0]?.detail ?? 'Refund failed',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[square-refund] error:', err instanceof Error ? err.message : String(err))
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
