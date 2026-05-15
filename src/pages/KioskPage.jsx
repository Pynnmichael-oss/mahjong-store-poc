/**
 * KioskPage — self-serve check-in for the front-door iPad + Zebra USB scanner.
 *
 * The scanner acts as a HID keyboard: it types the QR value (user UUID) into
 * the focused hidden input, then fires Enter. No camera API is used.
 *
 * Required Supabase SQL (run once in SQL editor):
 *
 *   CREATE OR REPLACE FUNCTION kiosk_check_in(p_user_id uuid)
 *   RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
 *   DECLARE
 *     v_reservation reservations%ROWTYPE;
 *     v_session     sessions%ROWTYPE;
 *     v_profile     profiles%ROWTYPE;
 *     v_seat_number integer;
 *     v_now         timestamptz := NOW() AT TIME ZONE 'America/Chicago';
 *   BEGIN
 *     SELECT * INTO v_session FROM sessions
 *     WHERE (start_time AT TIME ZONE 'America/Chicago')
 *           BETWEEN v_now - INTERVAL '2 hours' AND v_now + INTERVAL '15 minutes'
 *     AND status IN ('open','active')
 *     ORDER BY start_time ASC LIMIT 1;
 *     IF NOT FOUND THEN
 *       RETURN jsonb_build_object('success',false,'error','no_active_session'); END IF;
 *
 *     SELECT * INTO v_reservation FROM reservations
 *     WHERE user_id = p_user_id AND session_id = v_session.id
 *     AND status IN ('confirmed','walk_in','checked_in')
 *     AND is_primary_seat = true LIMIT 1;
 *     IF NOT FOUND THEN
 *       RETURN jsonb_build_object('success',false,'error','no_reservation'); END IF;
 *
 *     IF v_reservation.status = 'checked_in' THEN
 *       RETURN jsonb_build_object('success',false,'error','already_checked_in'); END IF;
 *
 *     IF (v_session.start_time AT TIME ZONE 'America/Chicago') < v_now - INTERVAL '15 minutes' THEN
 *       RETURN jsonb_build_object('success',false,'error','window_closed'); END IF;
 *
 *     UPDATE reservations SET status='checked_in', checked_in_at=NOW() WHERE id=v_reservation.id;
 *
 *     SELECT seat_number INTO v_seat_number FROM seats WHERE id = v_reservation.seat_id;
 *     SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
 *
 *     RETURN jsonb_build_object(
 *       'success',    true,
 *       'name',       v_profile.full_name,
 *       'seat_number',v_seat_number,
 *       'start_time', v_session.start_time,
 *       'end_time',   v_session.end_time
 *     );
 *   END; $$;
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabase.js'
import { getTableForSeat } from '../lib/businessRules.js'
import { formatTime } from '../lib/dateUtils.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ERROR_MESSAGES = {
  no_active_session:  'No session is currently open.',
  no_reservation:     'No reservation found for this session.',
  already_checked_in: "You're already checked in!",
  window_closed:      'Check-in for this session has closed.\nPlease see an employee.',
}

export default function KioskPage() {
  const [state,    setState]    = useState('idle') // idle | loading | success | error
  const [result,   setResult]   = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef  = useRef(null)
  const bufferRef = useRef('')

  // Re-focus hidden input every 500 ms while idle
  useEffect(() => {
    if (state !== 'idle') return
    inputRef.current?.focus()
    const id = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus()
      }
    }, 500)
    return () => clearInterval(id)
  }, [state])

  // Auto-return to idle
  useEffect(() => {
    if (state === 'success') {
      const t = setTimeout(() => setState('idle'), 4000)
      return () => clearTimeout(t)
    }
    if (state === 'error') {
      const t = setTimeout(() => setState('idle'), 3000)
      return () => clearTimeout(t)
    }
  }, [state])

  async function handleScan(value) {
    const trimmed = value.trim()
    if (!trimmed || !UUID_RE.test(trimmed)) {
      setErrorMsg('Invalid code. Please try again.')
      setState('error')
      return
    }

    setState('loading')

    try {
      const { data, error } = await supabase
        .rpc('kiosk_check_in', { p_user_id: trimmed })
      if (error) throw error

      if (data?.success) {
        setResult(data)
        setState('success')
      } else {
        setErrorMsg(ERROR_MESSAGES[data?.error] ?? 'Something went wrong. Please see an employee.')
        setState('error')
      }
    } catch {
      setErrorMsg('Connection error. Please see an employee.')
      setState('error')
    }
  }

  function handleKeyDown(e) {
    if (state !== 'idle') return
    if (e.key === 'Enter') {
      const val = bufferRef.current
      bufferRef.current = ''
      if (inputRef.current) inputRef.current.value = ''
      handleScan(val)
    }
  }

  function handleChange(e) {
    bufferRef.current = e.target.value
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (state === 'success' && result) {
    const tableInfo = result.seat_number ? getTableForSeat(result.seat_number) : null
    const firstName = result.name?.split(' ')[0] ?? 'Member'

    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: '#1D9E75' }}>
        <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mb-8">
          <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="font-playfair text-white text-center" style={{ fontSize: '36px' }}>
          Welcome, {firstName}!
        </h1>

        {tableInfo && result.seat_number && (
          <p className="font-cormorant italic text-white/80 text-2xl mt-3">
            {tableInfo.tableName} · Seat {result.seat_number}
          </p>
        )}

        {result.start_time && (
          <p className="font-cormorant italic text-white/80 text-xl mt-1">
            {formatTime(result.start_time)} – {formatTime(result.end_time)}
          </p>
        )}

        <p className="font-sans text-white/70 text-base mt-6 tracking-wide">Enjoy your game!</p>
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center px-10" style={{ background: '#E24B4A' }}>
        <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mb-8">
          <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <p className="font-playfair text-white text-center leading-snug" style={{ fontSize: '28px', whiteSpace: 'pre-line' }}>
          {errorMsg}
        </p>
      </div>
    )
  }

  // ── Idle / Loading ──────────────────────────────────────────────────────────
  return (
    <div
      className="bg-navy fixed inset-0 flex flex-col items-center justify-center select-none"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Brand */}
      <div className="text-center mb-14">
        <h1 className="font-playfair text-sky" style={{ fontSize: '52px', lineHeight: 1.1 }}>
          Four Winds
        </h1>
        <p className="font-playfair text-sky mt-2" style={{ fontSize: '34px' }}>
          Mahjong Club
        </p>
      </div>

      {/* Animated QR icon */}
      <div className={`mb-10 ${state === 'loading' ? 'opacity-30' : 'animate-pulse'}`}>
        <svg className="w-24 h-24 text-sky/40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="8" height="8" rx="1" strokeWidth="1.5"/>
          <rect x="5" y="5" width="4" height="4" fill="currentColor" stroke="none"/>
          <rect x="13" y="3" width="8" height="8" rx="1" strokeWidth="1.5"/>
          <rect x="15" y="5" width="4" height="4" fill="currentColor" stroke="none"/>
          <rect x="3" y="13" width="8" height="8" rx="1" strokeWidth="1.5"/>
          <rect x="5" y="15" width="4" height="4" fill="currentColor" stroke="none"/>
          <rect x="13" y="13" width="2" height="2" fill="currentColor" stroke="none"/>
          <rect x="17" y="13" width="2" height="2" fill="currentColor" stroke="none"/>
          <rect x="13" y="17" width="2" height="2" fill="currentColor" stroke="none"/>
          <rect x="17" y="17" width="2" height="2" fill="currentColor" stroke="none"/>
          <rect x="15" y="15" width="2" height="2" fill="currentColor" stroke="none"/>
        </svg>
      </div>

      {/* Prompt */}
      <p className="font-cormorant italic text-sky/60 text-center" style={{ fontSize: '26px' }}>
        {state === 'loading' ? 'Checking in…' : 'Scan your QR code to check in'}
      </p>

      {/* Hidden input — scanner target */}
      <input
        ref={inputRef}
        type="text"
        inputMode="none"
        tabIndex={0}
        className="fixed opacity-0 pointer-events-none"
        style={{ width: 1, height: 1, top: 0, left: 0 }}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        readOnly={false}
      />

      {/* Subtle exit link for staff */}
      <Link
        to="/employee"
        className="fixed bottom-5 right-5 font-sans text-white/20 hover:text-white/50 transition-colors"
        style={{ fontSize: '10px' }}
      >
        Exit kiosk
      </Link>
    </div>
  )
}
