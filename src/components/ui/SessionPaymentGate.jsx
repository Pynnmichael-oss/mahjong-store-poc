import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../services/supabase.js'
import { getSavedCard, saveCard, chargeCardOnFile } from '../../services/cardService.js'
import { getMembershipConfig, getMembershipLabel, getTableForSeat, hasWeeklyLimit } from '../../lib/businessRules.js'
import { calculateBookingCost } from '../../lib/calculateBookingCost.js'
import Alert from './Alert.jsx'
import { formatTime } from '../../lib/dateUtils.js'

const APP_ID      = import.meta.env.VITE_SQUARE_APP_ID
const LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID

/**
 * SessionPaymentGate
 *
 * Props:
 *   session            {object}    — the session being booked
 *   selectedSeats      {object[]}  — array of selected seat objects
 *   profile            {object}    — current user profile
 *   onPaymentComplete  {fn}        — called with paymentId (string) or null (no payment needed)
 *   onCancel           {fn}        — called if user cancels
 */
export default function SessionPaymentGate({
  session, selectedSeats = [], profile,
  onPaymentComplete, onCancel,
  onPaymentFailed,   // NEW — called when charge fails so parent can release seats
  skipDuplicateCheck = false, overrideTotalCents
}) {
  const { user } = useAuth()

  const [checking,          setChecking]          = useState(true)
  const [weeklySessionsUsed, setWeeklySessionsUsed] = useState(0)
  const [savedCard,          setSavedCard]          = useState(null)
  const [showCardForm,       setShowCardForm]       = useState(false)
  const [submitting,         setSubmitting]         = useState(false)
  const [error,              setError]              = useState(null)
  const [alreadyBooked,      setAlreadyBooked]      = useState(false)
  const [newCardInfo,        setNewCardInfo]         = useState(null)

  const cardRef       = useRef(null)
  const submittingRef = useRef(false)
  const [cardReady, setCardReady] = useState(false)
  const [cardError, setCardError] = useState(null)

  // ── Derive booking cost ──────────────────────────────────────────────────────
  const type   = profile?.membership_type
  const config = getMembershipConfig(type)

  const { totalCents, ownSeatCost, guestSeatCost, extraSeats, isFree, isOverage } = (() => {
    if (overrideTotalCents !== undefined) {
      return {
        totalCents:    overrideTotalCents,
        ownSeatCost:   0,
        guestSeatCost: overrideTotalCents,
        extraSeats:    selectedSeats.length,
        isFree:        overrideTotalCents === 0,
        isOverage:     false,
      }
    }
    return checking
      ? { totalCents: 0, ownSeatCost: 0, guestSeatCost: 0, extraSeats: 0, isFree: true, isOverage: false }
      : calculateBookingCost({
          membershipType:    type,
          seatCount:         selectedSeats.length,
          weeklySessionsUsed,
        })
  })()

  // ── Display helpers ──────────────────────────────────────────────────────────
  const seatLine = selectedSeats.length === 1
    ? (() => {
        const info = getTableForSeat(selectedSeats[0].seat_number)
        return `${info.tableName} · Seat ${selectedSeats[0].seat_number}`
      })()
    : `${selectedSeats.length} seats — ${[...new Set(selectedSeats.map(s => getTableForSeat(s.seat_number).tableName))].join(', ')}`

  const timeLine = session ? `${formatTime(session.start_time)} – ${formatTime(session.end_time)}` : null

  // ── Determine payment requirement on mount ────────────────────────────────
  useEffect(() => {
    if (profile?.id) determinePayment()
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function determinePayment() {
    // Check for existing primary reservation (prevents double-booking)
    if (!skipDuplicateCheck) {
      const { count: dupCount } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('session_id', session.id)
        .eq('is_primary_seat', true)
        .in('status', ['confirmed', 'walk_in', 'checked_in'])

      if (dupCount > 0) {
        setAlreadyBooked(true)
        setChecking(false)
        return
      }
    }

    // Fetch weekly count for tiers with a weekly limit (flower_pass, bamboo_pass)
    if (hasWeeklyLimit(type)) {
      setWeeklySessionsUsed(await fetchWeeklyCount())
    }

    // Pre-fetch saved card for any member who might need to pay
    if (type !== 'dragon_pass' && type !== 'founding_member') {
      const card = await getSavedCard(profile.id)
      setSavedCard(card?.square_card_id ? card : null)
    }

    setChecking(false)
  }

  async function fetchWeeklyCount() {
    const sessionDate = session?.date
    if (!sessionDate) return 0
    // Build Mon–Sun boundaries for the session's week
    const date = new Date(sessionDate + 'T12:00:00')
    const day = date.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(date)
    monday.setDate(date.getDate() + diffToMonday)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    const { data } = await supabase
      .from('reservations')
      .select('sessions!inner(date)')
      .eq('user_id', profile.id)
      .eq('is_primary_seat', true)
      .in('status', ['confirmed', 'walk_in', 'checked_in'])
      .gte('sessions.date', monday.toISOString().split('T')[0])
      .lte('sessions.date', sunday.toISOString().split('T')[0])

    return data?.length ?? 0
  }

  // ── Square card field ─────────────────────────────────────────────────────
  const showingCardForm = !isFree && !checking && (!savedCard || showCardForm)

  useEffect(() => {
    if (!showingCardForm) return

    let card = null
    let cancelled = false

    async function initSquare() {
      if (!APP_ID || !LOCATION_ID) {
        setCardError('Square is not configured. Check VITE_SQUARE_APP_ID and VITE_SQUARE_LOCATION_ID.')
        return
      }
      try {
        const { payments } = await import('@square/web-sdk')
        const instance = await payments(APP_ID, LOCATION_ID)
        card = await instance.card()
        await card.attach('#session-gate-card-field')
        if (!cancelled) { cardRef.current = card; setCardReady(true) }
      } catch (err) {
        if (!cancelled) setCardError(err?.message ?? 'Failed to load payment form')
      }
    }

    initSquare()
    return () => {
      cancelled = true
      card?.destroy?.()
      cardRef.current = null
      setCardReady(false)
      setCardError(null)
    }
  }, [showingCardForm]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Charge saved card ─────────────────────────────────────────────────────
  async function handleSavedCardConfirm() {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setError(null)
    try {
      const desc = `Four Winds session fee — ${selectedSeats.length} seat${selectedSeats.length !== 1 ? 's' : ''} — ${session.date}`
      const { paymentId } = await chargeCardOnFile({
        userId:           profile.id,
        squareCustomerId: savedCard.square_customer_id,
        cardId:           savedCard.square_card_id,
        amountCents:      totalCents,
        description:      desc,
        paymentType:      'session',
        membershipType:   profile.membership_type,
      })
      onPaymentComplete(paymentId)
    } catch (err) {
      setError(err.message ?? 'Payment failed')
      if (onPaymentFailed) onPaymentFailed()
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  // ── Submit new card form ──────────────────────────────────────────────────
  async function handleNewCardSubmit(e) {
    e.preventDefault()
    if (!cardRef.current || !cardReady || submitting) return
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setError(null)
    try {
      const result = await cardRef.current.tokenize()
      if (result.status !== 'OK') {
        throw new Error(result.errors?.[0]?.message ?? 'Card validation failed')
      }

      const saved = await saveCard({
        userId:      profile.id,
        token:       result.token,
        email:       user.email,
        displayName: profile.full_name ?? user.email,
      })
      setNewCardInfo({ cardLast4: saved.cardLast4, cardBrand: saved.cardBrand })

      const desc = `Four Winds session fee — ${selectedSeats.length} seat${selectedSeats.length !== 1 ? 's' : ''} — ${session.date}`
      const { paymentId } = await chargeCardOnFile({
        userId:           profile.id,
        squareCustomerId: saved.squareCustomerId,
        cardId:           saved.squareCardId,
        amountCents:      totalCents,
        description:      desc,
        paymentType:      'session',
        membershipType:   profile.membership_type,
      })

      onPaymentComplete(paymentId)
    } catch (err) {
      setError(err.message ?? 'Payment failed')
      setCardReady(false)
      setTimeout(() => setCardReady(true), 100)
      if (onPaymentFailed) onPaymentFailed()
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  // ── Cost breakdown block ──────────────────────────────────────────────────
  function CostBreakdown() {
    const ownLabel = ownSeatCost === 0
      ? `Free (${getMembershipLabel(type)})`
      : `$${(ownSeatCost / 100).toFixed(2)}`

    const overageNote = isOverage
      ? type === 'flower_pass'
        ? "You've used both sessions this week"
        : type === 'bamboo_pass'
          ? "You've used your session this week"
          : null
      : null

    return (
      <div className="bg-sky-pale rounded-xl p-4 space-y-1.5">
        {overageNote && (
          <p className="font-sans text-xs text-gold font-medium mb-1">{overageNote}</p>
        )}
        <div className="flex justify-between items-baseline">
          <span className="font-cormorant text-text-mid" style={{ fontSize: '13px' }}>Your seat</span>
          <span className="font-sans text-navy" style={{ fontSize: '13px' }}>{ownLabel}</span>
        </div>
        {extraSeats > 0 && (
          <div className="flex justify-between items-baseline">
            <span className="font-cormorant text-text-mid" style={{ fontSize: '13px' }}>
              {extraSeats} guest{extraSeats !== 1 ? 's' : ''} × $15
            </span>
            <span className="font-sans text-navy" style={{ fontSize: '13px' }}>
              ${(guestSeatCost / 100).toFixed(2)}
            </span>
          </div>
        )}
        <div className="flex justify-between items-baseline border-t border-navy/10 pt-1.5">
          <span className="font-cormorant text-text-mid font-medium" style={{ fontSize: '13px' }}>Total</span>
          <span className="font-sans text-navy font-medium" style={{ fontSize: '13px' }}>
            ${(totalCents / 100).toFixed(2)}
          </span>
        </div>
      </div>
    )
  }

  const totalLabel = `$${(totalCents / 100).toFixed(2)}`

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (checking) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-playfair text-navy text-lg">{seatLine}</p>
          {timeLine && <p className="font-sans text-xs text-text-soft mt-0.5">{timeLine}</p>}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="font-sans text-sm text-text-soft hover:text-navy transition-colors">
            Cancel
          </button>
          <span className="font-sans text-sm text-text-soft px-4">Checking…</span>
        </div>
      </div>
    )
  }

  if (alreadyBooked) {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="font-sans text-sm text-red-600 font-medium">
          You already have a reservation for this session.
        </p>
        <button onClick={onCancel} className="px-5 py-2.5 rounded-full font-sans text-sm font-medium border-[1.5px] border-navy text-navy hover:bg-sky-pale transition-all">
          Back
        </button>
      </div>
    )
  }

  // No payment required (dragon_pass, or within limits with 1 seat)
  if (isFree) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-playfair text-navy text-lg">{seatLine}</p>
          {timeLine && <p className="font-sans text-xs text-text-soft mt-0.5">{timeLine}</p>}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button onClick={onCancel} className="font-sans text-sm text-text-soft hover:text-navy transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onPaymentComplete(null)}
            className="px-6 py-3 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all"
          >
            Confirm Reservation
          </button>
        </div>
      </div>
    )
  }

  // Payment required — saved card on file
  if (savedCard && !showCardForm) {
    const cardLabel = newCardInfo
      ? `${newCardInfo.cardBrand} ···· ${newCardInfo.cardLast4}`
      : 'Card on file'

    return (
      <div className="space-y-4 w-full">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-sans text-xs uppercase tracking-[3px] text-sky-mid mb-1">Session Fee</p>
            <p className="font-playfair text-navy text-3xl">{totalLabel}</p>
          </div>
          <div className="text-right">
            <p className="font-sans text-xs text-text-soft">{seatLine}</p>
            {timeLine && <p className="font-sans text-xs text-text-soft mt-0.5">{timeLine}</p>}
          </div>
        </div>

        {(extraSeats > 0 || ownSeatCost > 0) && <CostBreakdown />}

        <div className="flex items-center justify-between bg-sky-light rounded-xl px-4 py-2.5">
          <span className="font-sans text-sm text-navy">{cardLabel}</span>
          <button
            onClick={() => { setShowCardForm(true); setError(null) }}
            className="font-sans text-xs text-sky-mid underline hover:text-navy transition-colors"
          >
            Change card →
          </button>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <p className="font-cormorant italic text-text-soft text-xs text-center mb-2">
          Cancel 24+ hours before the session for a full refund.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-full font-sans text-sm font-medium border-[1.5px] border-navy text-navy hover:bg-sky-pale transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSavedCardConfirm}
            disabled={submitting}
            className="flex-1 py-3 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50"
          >
            {submitting ? 'Processing…' : `Confirm & Reserve — ${totalLabel}`}
          </button>
        </div>
      </div>
    )
  }

  // Payment required — card entry form
  return (
    <div className="space-y-4 w-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-sans text-xs uppercase tracking-[3px] text-sky-mid mb-1">Session Fee</p>
          <p className="font-playfair text-navy text-3xl">{totalLabel}</p>
        </div>
        <div className="text-right">
          <p className="font-sans text-xs text-text-soft">{seatLine}</p>
          {timeLine && <p className="font-sans text-xs text-text-soft mt-0.5">{timeLine}</p>}
        </div>
      </div>

      {(extraSeats > 0 || ownSeatCost > 0) && <CostBreakdown />}

      <form onSubmit={handleNewCardSubmit} className="space-y-4">
        <div>
          <label className="block font-sans text-xs uppercase tracking-[3px] text-sky-mid mb-2">
            Card Details — {totalLabel} session fee
          </label>
          <div
            id="session-gate-card-field"
            className="min-h-[44px] rounded-xl border border-navy/20 bg-white px-1 py-1"
          />
          {!cardReady && !cardError && (
            <p className="font-sans text-xs text-text-soft mt-1">Loading card field…</p>
          )}
          {cardError && (
            <p className="font-sans text-xs text-red-600 mt-1">{cardError}</p>
          )}
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {import.meta.env.DEV && (
          <p className="font-sans text-[11px] text-text-soft text-center">
            Sandbox — use <span className="font-mono">4111 1111 1111 1111</span>, any future date, any CVV
          </p>
        )}

        <p className="font-cormorant italic text-text-soft text-xs text-center mb-2">
          Cancel 24+ hours before the session for a full refund.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-full font-sans text-sm font-medium border-[1.5px] border-navy text-navy hover:bg-sky-pale transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!cardReady || submitting}
            className="flex-1 py-3 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50"
          >
            {submitting ? 'Processing…' : `Pay ${totalLabel} & Reserve`}
          </button>
        </div>
      </form>
    </div>
  )
}
