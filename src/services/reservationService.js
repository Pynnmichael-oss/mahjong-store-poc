import { supabase } from './supabase.js'
import { updateSeatStatus } from './seatService.js'

export async function createReservation(payload, paymentId = null) {
  // Prevent double-booking before attempting the insert
  if (payload.user_id && payload.session_id) {
    const { count } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', payload.user_id)
      .eq('session_id', payload.session_id)
      .in('status', ['confirmed', 'walk_in', 'checked_in'])
      // 'cancelled' intentionally excluded — allows rebooking after cancellation
    if (count > 0) {
      throw new Error('You already have a reservation for this session.')
    }
  }

  const insertPayload = {
    ...payload,
    payment_status: paymentId ? 'paid' : 'not_required',
  }

  const { data, error } = await supabase
    .from('reservations')
    .insert(insertPayload)
    .select()
    .single()
  if (error) {
    if (error.code === '23505') {
      throw new Error('That seat was just taken. Please choose another.')
    }
    throw error
  }

  await updateSeatStatus(payload.seat_id, payload.is_walk_in ? 'occupied' : 'reserved')

  // Link the payment record back to this reservation
  if (paymentId && data?.id) {
    const { error: payErr } = await supabase
      .from('payments')
      .update({ reference_id: data.id })
      .eq('id', paymentId)
    if (payErr) {
      console.error('[reservationService] failed to link payment to reservation:', payErr.message)
    }
  }

  return data
}

export async function createMultiSeatReservation({
  userId, sessionId, selectedSeats, membershipType, isFlaggedOverage, paymentId = null,
}) {
  const seatIds = selectedSeats.map(s => s.id)

  const { data, error } = await supabase.rpc('reserve_seats', {
    p_user_id:    userId,
    p_session_id: sessionId,
    p_seat_ids:   seatIds,
    p_membership: membershipType ?? 'four_winds_member',
    p_is_overage: isFlaggedOverage ?? false,
    p_payment_id: paymentId ?? null,
  })

  if (error) {
    if (error.message?.includes('no longer available')) {
      throw new Error('One or more seats were just taken. Please select different seats.')
    }
    if (error.code === '23505') {
      throw new Error('One or more seats were just taken. Please select different seats.')
    }
    throw error
  }

  // Link payment record to primary reservation (via SECURITY DEFINER RPC)
  if (paymentId && data?.length) {
    const primary = data.find(r => r.is_primary_seat)
    if (primary) {
      const { error: linkErr } = await supabase.rpc('link_payment_to_reservation', {
        p_payment_id:     paymentId,
        p_reservation_id: primary.id,
        p_user_id:        userId,
      })
      if (linkErr) console.warn('[reservationService] payment link warning:', linkErr.message)
    }
  }

  return data
}

export async function addSeatsToBooking({
  userId, sessionId, newSeats, existingGroupId, membershipType, paymentId = null,
}) {
  const groupId = existingGroupId ?? crypto.randomUUID()
  const now = new Date().toISOString()

  const newReservations = newSeats.map(seat => ({
    user_id:                    userId,
    session_id:                 sessionId,
    seat_id:                    seat.id,
    status:                     'confirmed',
    payment_status:             paymentId ? 'paid' : 'not_required',
    membership_type_at_booking: membershipType,
    is_primary_seat:            false,
    guest_count:                0,
    group_reservation_id:       groupId,
    is_flagged_overage:         false,
    is_walk_in:                 false,
    reserved_at:                now,
  }))

  const { data, error } = await supabase
    .from('reservations')
    .insert(newReservations)
    .select()

  if (error) {
    if (error.code === '23505') throw new Error('One of those seats was just taken. Please choose another.')
    throw new Error(error.message)
  }

  // If no group existed yet, link the primary reservation to the new group
  if (existingGroupId === null) {
    await supabase
      .from('reservations')
      .update({ group_reservation_id: groupId })
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .eq('is_primary_seat', true)
  }

  const seatUpdateResults = await Promise.allSettled(
    newReservations.map(r => updateSeatStatus(r.seat_id, 'reserved'))
  )
  const failedUpdates = seatUpdateResults.filter(r => r.status === 'rejected')
  if (failedUpdates.length > 0) {
    console.error('[reservationService] seat status update failed for added seats:', failedUpdates)
    throw new Error('Seats were reserved but seat status failed to update. Please contact staff.')
  }

  if (paymentId && data?.[0]) {
    const { error: payErr } = await supabase
      .from('payments')
      .update({ reference_id: data[0].id })
      .eq('id', paymentId)
    if (payErr) console.error('[reservationService] failed to link add-seats payment:', payErr.message)
  }

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
    .select('*, profiles!user_id(*), seats(*)')
    .eq('session_id', sessionId)
    .order('reserved_at', { ascending: true })
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

export async function checkCancellationEligibility(reservationId, userId) {
  const { data, error } = await supabase.rpc('get_cancellation_eligibility', {
    p_reservation_id: reservationId,
    p_user_id:        userId,
  })
  if (error) throw error
  return data
}

export async function cancelReservationWithRefund(reservationId, userId, isEmployee = false) {
  const { data, error } = await supabase.rpc('cancel_reservation_with_refund', {
    p_reservation_id: reservationId,
    p_user_id:        userId,
    p_is_employee:    isEmployee,
  })
  if (error) throw error
  if (!data?.success) throw new Error(data?.reason ?? 'Cancellation failed')

  // If refundable, trigger refund via Edge Function
  if (data.refundable && data.square_payment_id) {
    const { data: { session: authSession } } = await supabase.auth.getSession()
    const { data: refundData, error: refundError } = await supabase.functions.invoke('square-refund', {
      body: {
        squarePaymentId: data.square_payment_id,
        amountCents:     data.refund_amount,
        reason:          'Customer cancellation',
      },
      headers: authSession?.access_token
        ? { Authorization: `Bearer ${authSession.access_token}` }
        : {},
    })
    if (refundError) console.error('[cancelReservation] refund invoke failed:', refundError.message)
    if (!refundData?.success) console.error('[cancelReservation] refund failed:', refundData?.error)
  }

  return data
}
