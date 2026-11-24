// purchase-bf-special — one-time "Black Friday Special"
//
// $357 prepaid for 6 months of Dragon Pass access. This is NOT a Square
// subscription and does NOT auto-renew: it writes profiles.membership_type =
// 'dragon_pass' plus a membership_expires_at marker, and the nightly pg_cron job
// 'expire-promo-memberships' reverts the tier when it lapses. No Square catalog
// objects are involved.
//
// Modelled on square-payment, which is deliberately left untouched. Differences
// that matter:
//   * The amount is a SERVER CONSTANT. No price ever comes from the client.
//   * The idempotency key is deterministic, so a double-submit cannot double-charge.
//   * Post-charge DB failures are NOT swallowed (square-payment logs and moves on);
//     here they raise a billing_alerts row so staff can fulfil by hand.
//
// Fails closed: absent/!= 'true' PROMO_BF_ENABLED, or absent window env vars,
// reject every request.
//
// Required Supabase secrets:
//   PROMO_BF_ENABLED=true
//   PROMO_STARTS_AT=2026-11-27T06:00:00Z
//   PROMO_ENDS_AT=2026-11-28T05:59:59Z
// (plus the existing SQUARE_ACCESS_TOKEN / SQUARE_LOCATION_ID / SQUARE_ENV)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Server-side constants — never client-supplied ───────────────────────────
const PROMO_AMOUNT_CENTS = 35700
const PROMO_PAYMENT_TYPE = 'promo_bf2026'
const PROMO_MONTHS = 6
const PROMO_TIER = 'dragon_pass'
const PROMO_NOTE = 'Black Friday Special — 6 months Dragon Pass'
const TZ = 'America/Chicago'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, ' +
    'x-supabase-client, accept, accept-language',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const fail = (error: string, status = 400) => json({ success: false, error }, status)

async function verifyAuth(req: Request): Promise<{ userId: string; role: string }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header')
  }
  const jwt = authHeader.replace('Bearer ', '')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
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

// ─── Chicago-local date arithmetic ───────────────────────────────────────────
// Mirrors Postgres `(now() AT TIME ZONE 'America/Chicago' + interval '6 months')`
// converted back to UTC: add 6 CALENDAR months to the Chicago wall-clock time,
// then re-resolve to a UTC instant using the offset in effect on that future
// date. A naive `setMonth` on a UTC Date would drift by an hour across the
// March DST transition, which a Nov->May window always crosses.

type Wall = { year: number; month: number; day: number; hour: number; minute: number; second: number }

function chicagoWall(d: Date): Wall {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const p: Record<string, string> = {}
  for (const part of fmt.formatToParts(d)) {
    if (part.type !== 'literal') p[part.type] = part.value
  }
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour) % 24, // Intl can emit "24" for midnight
    minute: Number(p.minute),
    second: Number(p.second),
  }
}

// Offset in ms at instant `d`, such that utcMillis = wallAsIfUtc - offset.
function tzOffsetMs(d: Date): number {
  const w = chicagoWall(d)
  const wallAsUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second)
  return wallAsUtc - Math.floor(d.getTime() / 1000) * 1000
}

function chicagoWallToUtc(w: Wall): Date {
  const naive = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second)
  // Two passes: the first offset is sampled at the wrong instant if the target
  // sits on the far side of a DST change; re-sampling at the corrected guess
  // converges for every case except the ~1h non-existent spring-forward gap.
  let guess = new Date(naive - tzOffsetMs(new Date(naive)))
  guess = new Date(naive - tzOffsetMs(guess))
  return guess
}

function promoExpiryFromNow(now: Date): Date {
  const w = chicagoWall(now)
  let year = w.year
  let month = w.month + PROMO_MONTHS
  if (month > 12) { year += Math.floor((month - 1) / 12); month = ((month - 1) % 12) + 1 }
  // Clamp for short target months (e.g. Aug 31 + 6mo -> Feb 28/29).
  const daysInTarget = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const day = Math.min(w.day, daysInTarget)
  return chicagoWallToUtc({ ...w, year, month, day })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return fail('Method not allowed', 405)
  }

  // ─── 1. Feature flag and promo window (fail closed) ────────────────────────
  if (Deno.env.get('PROMO_BF_ENABLED') !== 'true') {
    console.log('[purchase-bf-special] rejected: PROMO_BF_ENABLED is not "true"')
    return fail('The Black Friday Special is not currently available.')
  }

  const startsAtRaw = Deno.env.get('PROMO_STARTS_AT')
  const endsAtRaw   = Deno.env.get('PROMO_ENDS_AT')
  if (!startsAtRaw || !endsAtRaw) {
    console.error('[purchase-bf-special] PROMO_STARTS_AT / PROMO_ENDS_AT not configured')
    return fail('The Black Friday Special is not currently available.')
  }
  const startsAt = new Date(startsAtRaw)
  const endsAt   = new Date(endsAtRaw)
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    console.error('[purchase-bf-special] promo window env vars are not valid ISO timestamps')
    return fail('The Black Friday Special is not currently available.')
  }

  const now = new Date()
  if (now < startsAt) {
    return fail('The Black Friday Special has not started yet. It runs on November 27 only.')
  }
  if (now > endsAt) {
    return fail('The Black Friday Special has ended.')
  }

  // ─── 2. Authenticate ──────────────────────────────────────────────────────
  let authedUserId: string
  try {
    authedUserId = (await verifyAuth(req)).userId
  } catch {
    return json({ success: false, error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(supabaseUrl, serviceKey)

  try {
    const body = await req.json().catch(() => ({}))
    const { token } = body as { token?: string }

    // ─── 3. Eligibility ─────────────────────────────────────────────────────
    const { data: profile, error: profileReadError } = await db
      .from('profiles')
      .select('id, email, full_name, subscription_id, membership_expires_at, unlimited_free_booking, square_customer_id, square_card_id')
      .eq('id', authedUserId)
      .single()

    if (profileReadError || !profile) {
      throw new Error(`Failed to read profile: ${profileReadError?.message ?? 'not found'}`)
    }

    if (profile.subscription_id) {
      return fail('You already have an active membership subscription. Please contact staff if you would like to switch to the Black Friday Special.')
    }
    if (profile.membership_expires_at) {
      return fail('You already have a prepaid membership on your account.')
    }
    if (profile.unlimited_free_booking) {
      return fail('Your account already has complimentary unlimited booking — no purchase is needed.')
    }

    const { data: existingPromo, error: existingPromoError } = await db
      .from('payments')
      .select('id')
      .eq('user_id', authedUserId)
      .eq('payment_type', PROMO_PAYMENT_TYPE)
      .eq('status', 'completed')
      .maybeSingle()

    if (existingPromoError) {
      throw new Error(`Failed to check existing promo payments: ${existingPromoError.message}`)
    }
    if (existingPromo) {
      return fail('You have already purchased the Black Friday Special.')
    }

    // ─── 4. Payment source: fresh token, else the card on file ──────────────
    const sourceId = token ?? profile.square_card_id
    if (!sourceId) {
      return fail('A payment method is required. Please add a card and try again.')
    }
    // A saved card id only works alongside its Square customer.
    const squareCustomerId = token ? undefined : profile.square_customer_id ?? undefined
    if (!token && !squareCustomerId) {
      return fail('A payment method is required. Please add a card and try again.')
    }

    const accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN')
    const locationId  = Deno.env.get('SQUARE_LOCATION_ID')
    const squareBase  = Deno.env.get('SQUARE_ENV') === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'
    if (!accessToken || !locationId) {
      throw new Error('Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID env var')
    }

    // Deterministic: a double-submit replays the first charge instead of
    // creating a second one. Paired with the payments_one_bf2026_per_user
    // partial unique index as a second line of defence.
    const idempotencyKey = `bf2026-${authedUserId}`

    console.log(`[purchase-bf-special] charging ${PROMO_AMOUNT_CENTS} cents for user ${authedUserId}`)

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
        amount_money: { amount: PROMO_AMOUNT_CENTS, currency: 'USD' },
        note: PROMO_NOTE,
      }),
    })

    const squareData = await squareRes.json()
    if (!squareRes.ok) {
      const detail = squareData?.errors?.[0]?.detail ?? squareData?.errors?.[0]?.code ?? 'Square API error'
      console.error('[purchase-bf-special] Square declined/errored:', detail)
      return fail(detail)
    }

    const squarePaymentId: string | undefined = squareData.payment?.id
    if (!squarePaymentId) {
      throw new Error('Square did not return a payment id')
    }
    console.log('[purchase-bf-special] Square payment id:', squarePaymentId)

    // ─── 5. Post-charge DB writes ───────────────────────────────────────────
    // Money has moved. From here, nothing may re-charge; a failure becomes a
    // billing_alerts row for staff to fulfil by hand.
    const recordFailure = async (stage: string, detail: string) => {
      console.error(`[purchase-bf-special] ${stage} FAILED after successful charge:`, detail)
      const { error: alertError } = await db
        .from('billing_alerts')
        .upsert({
          issue_type: 'promo_unfulfilled',
          dedup_key: `bf2026-${authedUserId}`,
          payment_ids: [],              // uuid[] NOT NULL; the Square id is text, so it lives in detail
          user_id: authedUserId,
          detail: {
            stage,
            error: detail,
            square_payment_id: squarePaymentId,
            amount_cents: PROMO_AMOUNT_CENTS,
            promo: PROMO_PAYMENT_TYPE,
            charged_at: new Date().toISOString(),
          },
        }, { onConflict: 'dedup_key', ignoreDuplicates: true })
      if (alertError) {
        // Last resort: the log line above is the only remaining record.
        console.error('[purchase-bf-special] billing_alerts insert ALSO failed:', alertError.message)
      }
    }

    const { data: paymentRow, error: paymentInsertError } = await db
      .from('payments')
      .insert({
        user_id: authedUserId,
        // reference_id is uuid and a Square payment id is not a uuid, so the
        // Square id goes in square_payment_id (and metadata) instead.
        reference_id: null,
        square_payment_id: squarePaymentId,
        square_order_id: squareData.payment?.order_id ?? null,
        amount_cents: PROMO_AMOUNT_CENTS,
        currency: 'USD',
        description: PROMO_NOTE,
        membership_type: PROMO_TIER,
        payment_type: PROMO_PAYMENT_TYPE,
        status: 'completed',
        metadata: { promo: PROMO_PAYMENT_TYPE, square_payment_id: squarePaymentId, months: PROMO_MONTHS },
      })
      .select('id')
      .single()

    if (paymentInsertError) {
      // 23505 = the partial unique index fired, i.e. a completed promo row
      // already exists and Square replayed the original charge. Not a new sale.
      if (paymentInsertError.code === '23505') {
        console.log('[purchase-bf-special] duplicate promo payment — Square replayed the idempotent charge')
        return fail('You have already purchased the Black Friday Special.')
      }
      await recordFailure('payments_insert', paymentInsertError.message)
      return fail(
        'Your payment went through, but we could not finish setting up your membership. ' +
        'Our staff have been alerted and will activate it shortly — you have not been charged twice.',
        500,
      )
    }

    const expiresAt = promoExpiryFromNow(now)

    const { error: profileUpdateError } = await db
      .from('profiles')
      .update({
        membership_type: PROMO_TIER,
        membership_expires_at: expiresAt.toISOString(),
        membership_payment_id: paymentRow?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authedUserId)

    if (profileUpdateError) {
      await recordFailure('profile_update', profileUpdateError.message)
      return fail(
        'Your payment went through, but we could not finish setting up your membership. ' +
        'Our staff have been alerted and will activate it shortly — you have not been charged twice.',
        500,
      )
    }

    console.log(`[purchase-bf-special] fulfilled — user ${authedUserId} on ${PROMO_TIER} until ${expiresAt.toISOString()}`)

    return json({
      success: true,
      paymentId: paymentRow?.id ?? null,
      squarePaymentId,
      membershipType: PROMO_TIER,
      membershipExpiresAt: expiresAt.toISOString(),
    }, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[purchase-bf-special] error:', msg)
    return fail(msg, 500)
  }
})
