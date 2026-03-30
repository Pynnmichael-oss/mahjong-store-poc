import { supabase } from './supabase.js'
import { updateSeatStatus } from './seatService.js'

export async function createReservation(payload) {
  const { data, error } = await supabase
    .from('reservations')
    .insert(payload)
    .select()
    .single()
  if (error) {
    if (error.code === '23505') {
      throw new Error('That seat was just taken. Please choose another.')
    }
    throw error
  }
  // Update seat status to reserved (or occupied for walk-in)
  await updateSeatStatus(payload.seat_id, payload.is_walk_in ? 'occupied' : 'reserved')
  return data
}

export async function fetchUserReservations(userId) {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, sessions(*), seats(*)')
    .eq('user_id', userId)
    .order('reserved_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchSessionReservations(sessionId) {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, profiles(*), seats(*)')
    .eq('session_id', sessionId)
    .order('reserved_at', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchReservationByQR(userId, sessionId) {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, sessions(*), seats(*)')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .single()
  if (error) throw error
  return data
}

export async function checkInReservation(reservationId, seatId) {
  const { data, error } = await supabase
    .from('reservations')
    .update({ status: 'checked_in', checked_in_at: new Date().toISOString() })
    .eq('id', reservationId)
    .select()
    .single()
  if (error) throw error
  await updateSeatStatus(seatId, 'occupied')
  return data
}

export async function markNoShow(reservationId) {
  const { data, error } = await supabase
    .from('reservations')
    .update({ status: 'no_show' })
    .eq('id', reservationId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function overrideNoShow(reservationId, employeeId) {
  const { data, error } = await supabase
    .from('reservations')
    .update({
      status: 'checked_in',
      override_by: employeeId,
      override_at: new Date().toISOString(),
    })
    .eq('id', reservationId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function cancelReservation(reservationId, seatId) {
  const { data, error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservationId)
    .select()
    .single()
  if (error) throw error
  await updateSeatStatus(seatId, 'available')
  return data
}
