import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const rawBody = await req.json()
    console.log('[send-sms] incoming request body:', JSON.stringify(rawBody))

    const { phone, guestName, sessionDate, sessionTime, tableName, seatNumber } = rawBody

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER')

    console.log('[send-sms] env check — accountSid present:', !!accountSid, '| authToken present:', !!authToken, '| fromNumber:', fromNumber ?? 'MISSING')

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Missing Twilio credentials in environment.')
    }

    const messageBody =
      `Hi ${guestName}! Your Four Winds seat is confirmed. ` +
      `${sessionDate} at ${sessionTime} — ${tableName}, Seat ${seatNumber}. ` +
      `Walk-in fee due at the door. See you soon!`

    const credentials = btoa(`${accountSid}:${authToken}`)
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

    console.log('[send-sms] calling Twilio URL:', twilioUrl)
    console.log('[send-sms] To:', phone, '| From:', fromNumber)

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, From: fromNumber, Body: messageBody }),
    })

    console.log('[send-sms] Twilio response status:', twilioRes.status)

    const responseText = await twilioRes.text()
    console.log('[send-sms] Twilio response body:', responseText)

    let twilioData: Record<string, unknown>
    try {
      twilioData = JSON.parse(responseText)
    } catch {
      throw new Error(`Non-JSON response from Twilio (status ${twilioRes.status}): ${responseText}`)
    }

    if (!twilioRes.ok) {
      throw new Error(String(twilioData.message ?? twilioData.error_message ?? 'Twilio error'))
    }

    console.log('[send-sms] success — SID:', twilioData.sid)

    return new Response(
      JSON.stringify({ success: true, sid: twilioData.sid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[send-sms] caught error:', err instanceof Error ? err.message : String(err))
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
