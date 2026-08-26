import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TABLE   = 'border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px;margin-top:8px'
const TH      = 'background:#1a3a6b;color:#b8d4f5;text-align:left;padding:8px 12px;white-space:nowrap'
const TD      = 'padding:8px 12px;border-bottom:1px solid #e6f1fb;color:#1a3a6b;vertical-align:top'
const TD_MONO = `${TD};font-family:monospace;font-size:12px`
const TR_ALT  = 'background:#f0f6fd'

type Profile = { id: string; full_name: string | null; email: string | null }
type Alert   = {
  id: string
  issue_type: string
  payment_ids: string[] | null
  user_id: string
  detail: Record<string, unknown> | null
  detected_at: string
}

function row(cells: string[], alt: boolean): string {
  const tds = cells.map((c, i) =>
    `<td style="${i >= 3 ? TD_MONO : TD}">${c}</td>`
  ).join('')
  return `<tr${alt ? ` style="${TR_ALT}"` : ''}>${tds}</tr>`
}

function section(title: string, count: number, headerCells: string[], dataRows: string[]): string {
  if (dataRows.length === 0) return ''
  const ths = headerCells.map(h => `<th style="${TH}">${h}</th>`).join('')
  return `
    <h2 style="font-family:Arial,sans-serif;color:#1a3a6b;font-size:16px;margin:32px 0 6px">${title} (${count})</h2>
    <table style="${TABLE}">
      <thead><tr>${ths}</tr></thead>
      <tbody>${dataRows.join('')}</tbody>
    </table>`
}

Deno.serve(async () => {
  const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
  const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendKey    = Deno.env.get('RESEND_API_KEY')!
  const alertToEmail = Deno.env.get('ALERT_TO_EMAIL')!

  const db = createClient(supabaseUrl, serviceKey)

  const { data: alerts, error } = await db
    .from('billing_alerts')
    .select('id, issue_type, payment_ids, user_id, detail, detected_at')
    .eq('notified', false)
    .order('detected_at', { ascending: false })

  if (error) {
    console.error('[send-billing-alerts] query error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!alerts || alerts.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Resolve profiles for all unique user_ids in one query
  const userIds = [...new Set((alerts as Alert[]).map(a => a.user_id).filter(Boolean))]
  const { data: profileRows } = await db
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds)

  const profiles = new Map<string, Profile>((profileRows ?? []).map((p: Profile) => [p.id, p]))

  const orphans    = (alerts as Alert[]).filter(a => a.issue_type === 'orphan')
  const duplicates = (alerts as Alert[]).filter(a => a.issue_type === 'duplicate_seat')

  // Build HTML sections
  const orphanRows = orphans.map((a, i) => {
    const p          = profiles.get(a.user_id)
    const name       = p?.full_name ?? a.user_id ?? '—'
    const email      = p?.email ?? '—'
    const amount     = a.detail?.amount_cents != null
      ? `$${(Number(a.detail.amount_cents) / 100).toFixed(2)}`
      : '—'
    const paymentId  = String(a.detail?.square_payment_id ?? '—')
    const paidAt     = String(a.detail?.paid_at ?? a.detected_at)
    return row([name, email, amount, paymentId, paidAt], i % 2 === 1)
  })

  const duplicateRows = duplicates.map((a, i) => {
    const p          = profiles.get(a.user_id)
    const name       = p?.full_name ?? a.user_id ?? '—'
    const count      = String(a.detail?.charge_count ?? '—')
    const seatId     = String(a.detail?.seat_id ?? '—')
    const sessionId  = String(a.detail?.session_id ?? '—')
    const ids        = Array.isArray(a.payment_ids) ? a.payment_ids.join('<br>') : String(a.payment_ids ?? '—')
    return row([name, count, seatId, sessionId, ids], i % 2 === 1)
  })

  const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="background:#faf8f3;padding:32px;font-family:Arial,sans-serif">
  <h1 style="color:#1a3a6b;font-size:22px;margin-bottom:4px">Four Winds — Billing Alerts</h1>
  <p style="color:#4a5568;font-size:14px;margin-top:0">${alerts.length} unnotified alert${alerts.length !== 1 ? 's' : ''} · ${new Date().toUTCString()}</p>
  ${section('Orphaned Payments', orphans.length,
      ['Customer', 'Email', 'Amount', 'Square Payment ID', 'Paid At'],
      orphanRows)}
  ${section('Duplicate Charges (same seat)', duplicates.length,
      ['Customer', 'Charge Count', 'Seat ID', 'Session ID', 'Payment IDs'],
      duplicateRows)}
</body></html>`

  // Plain-text fallback
  const textLines = (alerts as Alert[]).map((a, i) => {
    const p = profiles.get(a.user_id)
    return [
      `--- Alert ${i + 1} ---`,
      `Type:        ${a.issue_type}`,
      `User:        ${p?.full_name ?? a.user_id}`,
      `Email:       ${p?.email ?? '—'}`,
      `Detected:    ${a.detected_at}`,
      `Payment IDs: ${Array.isArray(a.payment_ids) ? a.payment_ids.join(', ') : a.payment_ids ?? '—'}`,
      `Detail:      ${a.detail ? JSON.stringify(a.detail) : '—'}`,
    ].join('\n')
  })
  const textDigest = textLines.join('\n\n')

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: alertToEmail,
      subject: `Four Winds billing alerts: ${alerts.length} new`,
      html: htmlBody,
      text: textDigest,
    }),
  })

  if (!resendRes.ok) {
    const body = await resendRes.text().catch(() => '')
    console.error('[send-billing-alerts] Resend error:', resendRes.status, body)
    return new Response(JSON.stringify({ error: 'Email delivery failed', detail: body }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const ids = (alerts as Alert[]).map(a => a.id)
  const { error: updateError } = await db
    .from('billing_alerts')
    .update({ notified: true })
    .in('id', ids)

  if (updateError) {
    console.error('[send-billing-alerts] update error:', updateError.message)
  }

  return new Response(JSON.stringify({ sent: alerts.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
