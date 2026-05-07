// Required Supabase SQL (run once in SQL editor):
//
// CREATE OR REPLACE FUNCTION get_cancellation_eligibility(
//   p_reservation_id uuid,
//   p_user_id uuid
// )
// RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
// DECLARE
//   v_reservation reservations%ROWTYPE;
//   v_session sessions%ROWTYPE;
//   v_now timestamptz := NOW();
//   v_session_start timestamptz;
//   v_hours_until numeric;
//   v_payment payments%ROWTYPE;
// BEGIN
//   SELECT * INTO v_reservation FROM reservations
//   WHERE id = p_reservation_id AND user_id = p_user_id LIMIT 1;
//   IF NOT FOUND THEN
//     RETURN jsonb_build_object('eligible', false, 'reason', 'Reservation not found');
//   END IF;
//   IF v_reservation.status != 'confirmed' THEN
//     RETURN jsonb_build_object('eligible', false, 'reason', 'Reservation cannot be cancelled');
//   END IF;
//   SELECT * INTO v_session FROM sessions WHERE id = v_reservation.session_id;
//   v_session_start := v_session.start_time;
//   v_hours_until := EXTRACT(EPOCH FROM (v_session_start - v_now)) / 3600;
//   SELECT * INTO v_payment FROM payments
//   WHERE reference_id = p_reservation_id AND status = 'completed' LIMIT 1;
//   IF v_hours_until >= 2 THEN
//     RETURN jsonb_build_object(
//       'eligible',          true,
//       'refundable',        v_payment.id IS NOT NULL,
//       'refund_amount',     COALESCE(v_payment.amount_cents, 0),
//       'square_payment_id', v_payment.square_payment_id,
//       'hours_until',       v_hours_until,
//       'session_start',     v_session_start,
//       'reservation_id',    p_reservation_id,
//       'group_id',          v_reservation.group_reservation_id
//     );
//   ELSE
//     RETURN jsonb_build_object(
//       'eligible',      true,
//       'refundable',    false,
//       'refund_amount', 0,
//       'hours_until',   v_hours_until,
//       'session_start', v_session_start,
//       'reason',        'Within 2-hour window — no refund'
//     );
//   END IF;
// END; $$;

import { supabase } from './supabase.js'

export async function checkCancellationEligibility(reservationId, userId) {
  const { data, error } = await supabase.rpc('get_cancellation_eligibility', {
    p_reservation_id: reservationId,
    p_user_id: userId,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function cancelReservation({
  reservationId,
  groupId = null,
  cancelWholeGroup = false,
  userId,
}) {
  let idsToCancel = [reservationId]

  if (cancelWholeGroup && groupId) {
    const { data: groupReservations } = await supabase
      .from('reservations')
      .select('id')
      .eq('group_reservation_id', groupId)
      .eq('user_id', userId)
      .in('status', ['confirmed', 'walk_in'])

    if (groupReservations?.length) {
      idsToCancel = groupReservations.map(r => r.id)
    }
  }

  // Step 1 — fetch seat IDs BEFORE cancelling (RLS may block reading cancelled rows)
  const { data: seatRows } = await supabase
    .from('reservations')
    .select('seat_id')
    .in('id', idsToCancel)

  // Step 2 — cancel the reservations
  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .in('id', idsToCancel)

  if (error) throw new Error(error.message)

  // Step 3 — free up the seats
  if (seatRows?.length) {
    await supabase
      .from('seats')
      .update({ status: 'available' })
      .in('id', seatRows.map(r => r.seat_id))
  }

  return { cancelledCount: idsToCancel.length }
}

export async function processRefund({ squarePaymentId, amountCents, reason = 'Customer cancellation' }) {
  const { data: { session: authSession } } = await supabase.auth.getSession()
  const { data, error } = await supabase.functions.invoke('square-refund', {
    body: { squarePaymentId, amountCents, reason },
    headers: authSession?.access_token
      ? { Authorization: `Bearer ${authSession.access_token}` }
      : {},
  })
  if (error) throw new Error(error.message)
  if (!data?.success) throw new Error(data?.error ?? 'Refund failed')
  return data
}
