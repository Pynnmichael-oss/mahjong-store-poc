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
    const { phone, guestName, sessionDate, sessionTime, tableName, seatNumber } = await req.json()

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER')

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Missing Twilio credentials in environment.')
    }

    const body =
      `Hi ${guestName}! Your Four Winds seat is confirmed. ` +
      `${sessionDate} at ${sessionTime} — ${tableName}, Seat ${seatNumber}. ` +
      `Walk-in fee due at the door. See you soon! 🀄`

    const credentials = btoa(`${accountSid}:${authToken}`)

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, From: fromNumber, Body: body }),
      }
    )

    const twilioData = await twilioRes.json()

    if (!twilioRes.ok) {
      throw new Error(twilioData.message ?? 'Twilio error')
    }

    return new Response(
      JSON.stringify({ success: true, sid: twilioData.sid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
