import { supabase } from './supabase.js'
import { checkInReservation, markNoShow, overrideNoShow, createReservation } from './reservationService.js'
import { isWithinCheckinWindow } from '../lib/businessRules.js'
import { getWeekBoundaries } from '../lib/dateUtils.js'

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

export async function getWeeklyCheckInCount(userId) {
  const { weekStart, weekEnd } = getWeekBoundaries()

  const { count } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_primary_seat', true)
    .in('status', ['confirmed', 'walk_in', 'checked_in'])
    .gte('created_at', weekStart.toISOString())
    .lte('created_at', weekEnd.toISOString())

  return count ?? 0
}

export async function getWeeklyCheckInCountsBatch(userIds) {
  if (!userIds.length) return {}

  const { weekStart, weekEnd } = getWeekBoundaries()

  const { data } = await supabase
    .from('reservations')
    .select('user_id')
    .in('user_id', userIds)
    .eq('is_primary_seat', true)
    .in('status', ['confirmed', 'walk_in', 'checked_in'])
    .gte('created_at', weekStart.toISOString())
    .lte('created_at', weekEnd.toISOString())

  const counts = {}
  userIds.forEach(id => { counts[id] = 0 })
  ;(data ?? []).forEach(r => { counts[r.user_id] = (counts[r.user_id] ?? 0) + 1 })
  return counts
}

// Backward-compat aliases
export const getMonthlyCheckInCount = getWeeklyCheckInCount
export const getMonthlyCheckInCountsBatch = getWeeklyCheckInCountsBatch
