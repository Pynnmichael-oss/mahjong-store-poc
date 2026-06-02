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
  // If cancelling whole group, cancel each reservation individually via RPC
  if (cancelWholeGroup && groupId) {
    const { data: groupReservations } = await supabase
      .from('reservations')
      .select('id')
      .eq('group_reservation_id', groupId)
      .eq('user_id', userId)
      .in('status', ['confirmed', 'walk_in'])

    if (groupReservations?.length) {
      for (const r of groupReservations) {
        const { data, error } = await supabase.rpc('cancel_reservation_with_refund', {
          p_reservation_id: r.id,
          p_user_id:        userId,
          p_is_employee:    false,
        })
        if (error) throw new Error(error.message)
      }
      return { cancelledCount: groupReservations.length }
    }
  }

  // Single reservation — use RPC which handles seat release server-side
  const { data, error } = await supabase.rpc('cancel_reservation_with_refund', {
    p_reservation_id: reservationId,
    p_user_id:        userId,
    p_is_employee:    false,
  })
  if (error) throw new Error(error.message)
  if (!data?.success) throw new Error(data?.reason ?? 'Cancellation failed')

  return { cancelledCount: 1 }
}

export async function cancelMultipleReservations({ reservationIds, userId }) {
  if (!reservationIds?.length) {
    return { cancelledCount: 0, totalRefundCents: 0, refunds: [] }
  }

  const refunds = []
  let totalRefundCents = 0

  for (const id of reservationIds) {
    // Check eligibility per-seat to compute proportional refund
    const eligibility = await checkCancellationEligibility(id, userId)

    const { data, error } = await supabase.rpc('cancel_reservation_with_refund', {
      p_reservation_id: id,
      p_user_id:        userId,
      p_is_employee:    false,
    })
    if (error) throw new Error(error.message)
    if (!data?.success) throw new Error(data?.reason ?? `Cancellation failed for ${id}`)

    if (eligibility?.refundable && eligibility?.square_payment_id && eligibility?.refund_amount > 0) {
      refunds.push({
        squarePaymentId: eligibility.square_payment_id,
        amountCents: eligibility.refund_amount,
      })
      totalRefundCents += eligibility.refund_amount
    }
  }

  return { cancelledCount: reservationIds.length, totalRefundCents, refunds }
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
