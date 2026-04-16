import { supabase } from './supabase.js'
import { checkInReservation, markNoShow, overrideNoShow, createReservation } from './reservationService.js'
import { isWithinCheckinWindow } from '../lib/businessRules.js'

export async function processQRCheckin(userId, sessionId) {
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
    throw new Error('Check-in window is not open (within 15 min of session start).')
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

export async function processCheckinByMemberNumber(memberNumber, sessionId) {
  const num = parseInt(memberNumber, 10)
  if (isNaN(num)) throw new Error('Invalid member number.')
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('member_number', num)
    .single()
  if (error || !profile) throw new Error(`No member found with ID ${memberNumber}.`)
  return processQRCheckin(profile.id, sessionId)
}

export { markNoShow, overrideNoShow }

export async function getMonthlyCheckInCount(userId) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

  const { count } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'checked_in')
    .eq('membership_type_at_booking', 'flower_pass')
    .gte('checked_in_at', monthStart)
    .lt('checked_in_at', monthEnd)

  return count ?? 0
}

export async function getMonthlyCheckInCountsBatch(userIds) {
  if (!userIds.length) return {}

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

  const { data } = await supabase
    .from('reservations')
    .select('user_id')
    .in('user_id', userIds)
    .eq('status', 'checked_in')
    .eq('membership_type_at_booking', 'flower_pass')
    .gte('checked_in_at', monthStart)
    .lt('checked_in_at', monthEnd)

  const counts = {}
  userIds.forEach(id => { counts[id] = 0 })
  ;(data ?? []).forEach(r => { counts[r.user_id] = (counts[r.user_id] ?? 0) + 1 })
  return counts
}
