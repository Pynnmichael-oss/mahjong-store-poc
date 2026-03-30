import { supabase } from './supabase.js'
import { checkInReservation, markNoShow, overrideNoShow, createReservation } from './reservationService.js'
import { isWithinCheckinWindow } from '../lib/businessRules.js'

export async function processQRCheckin(userId, sessionId) {
  // Fetch the reservation
  const { data: reservation, error } = await supabase
    .from('reservations')
    .select('*, sessions(*), seats(*)')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .single()

  if (error || !reservation) throw new Error('Reservation not found.')
  if (reservation.status === 'checked_in') throw new Error('Already checked in.')
  if (reservation.status === 'cancelled') throw new Error('Reservation is cancelled.')

  if (!isWithinCheckinWindow(reservation.sessions)) {
    throw new Error('Check-in window is not open yet or has passed (within 15 min of start).')
  }

  return checkInReservation(reservation.id, reservation.seat_id)
}

export async function addWalkIn({ userId, sessionId, seatId, membershipType, employeeId }) {
  const payload = {
    user_id: userId,
    session_id: sessionId,
    seat_id: seatId,
    membership_type_at_booking: membershipType,
    is_flagged_overage: false,
    is_walk_in: true,
    status: 'walk_in',
    checked_in_at: new Date().toISOString(),
    reserved_at: new Date().toISOString(),
    override_by: employeeId,
    override_at: new Date().toISOString(),
  }
  return createReservation(payload)
}

export { markNoShow, overrideNoShow }
