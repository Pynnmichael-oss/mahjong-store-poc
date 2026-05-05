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
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
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

  try {
    const { squarePaymentId, amountCents, reason = 'Customer cancellation' } = await req.json()

    if (!squarePaymentId || !amountCents) {
      throw new Error('squarePaymentId and amountCents are required')
    }

    const accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN')
    const squareBase  = Deno.env.get('SQUARE_ENV') === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

    if (!accessToken) throw new Error('Missing SQUARE_ACCESS_TOKEN env var')

    console.log(`[square-refund] refunding ${amountCents} cents for payment ${squarePaymentId}`)

    const refundRes = await fetch(`${squareBase}/v2/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        payment_id:      squarePaymentId,
        amount_money: {
          amount:   amountCents,
          currency: 'USD',
        },
        reason,
      }),
    })

    const refundData = await refundRes.json()
    console.log(`[square-refund] Square response status: ${refundRes.status}`)

    if (!refundRes.ok) {
      const errDetail = refundData?.errors?.[0]?.detail
        ?? refundData?.errors?.[0]?.code
        ?? 'Square refund API error'
      throw new Error(errDetail)
    }

    const refundId = refundData.refund?.id
    console.log(`[square-refund] refund ID: ${refundId}`)

    // Update payment record status to refunded
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error: dbError } = await db
      .from('payments')
      .update({
        status:            'refunded',
        square_refund_id:  refundId,
        refunded_at:       new Date().toISOString(),
        refunded_by:       authedUserId,
      })
      .eq('square_payment_id', squarePaymentId)

    if (dbError) {
      console.error('[square-refund] failed to update payment record:', dbError.message)
    }

    return new Response(
      JSON.stringify({ success: true, refundId }),
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
