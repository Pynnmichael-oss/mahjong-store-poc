import { supabase } from './supabase.js'

export async function createGuestReservation(
  sessionId, seatId, guestName, guestPhone,
  { sessionDate, sessionTime, tableName, seatNumber } = {}
) {
  console.log('[guestService] calling rpc create_guest_reservation', { sessionId, seatId, guestName, guestPhone })
  const { data: sessionData } = await supabase.auth.getSession()
  console.log('[guestService] auth session:', JSON.stringify(sessionData, null, 2))

  const { data, error } = await supabase.rpc('create_guest_reservation', {
    p_session_id:  sessionId,
    p_seat_id:     seatId,
    p_guest_name:  guestName,
    p_guest_phone: guestPhone,
  })

  console.log('[guestService] rpc result — data:', JSON.stringify(data, null, 2))
  console.log('[guestService] rpc result — error:', JSON.stringify(error, null, 2))

  if (error) {
    if (error.code === '23505') throw new Error('That seat was just taken. Please choose another.')
    throw error
  }

  if (data && !error) {
    console.log('[SMS] reservation succeeded, invoking send-sms')
    console.log('[SMS] payload being sent:', {
      phone:       guestPhone,
      guestName:   guestName,
      sessionDate: sessionDate,
      sessionTime: sessionTime,
      tableName:   tableName,
      seatNumber:  seatNumber,
    })

    try {
      const { data: smsData, error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
          phone:       guestPhone,
          guestName:   guestName,
          sessionDate: sessionDate,
          sessionTime: sessionTime,
          tableName:   tableName,
          seatNumber:  seatNumber,
        },
      })
      console.log('[SMS] result — data:', smsData)
      console.log('[SMS] result — error:', smsError)
    } catch (smsErr) {
      console.log('[SMS] caught error:', smsErr)
    }
  }

  return { reservation: data }
}
