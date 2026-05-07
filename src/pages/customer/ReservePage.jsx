import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSession } from '../../hooks/useSessions.js'
import { useSeats } from '../../hooks/useSeats.js'
import { useUserReservations } from '../../hooks/useReservations.js'
import { useWeeklyLimit } from '../../hooks/useWeeklyLimit.js'
import SeatMap from '../../components/seats/SeatMap.jsx'
import OverageFlagBanner from '../../components/reservations/OverageFlagBanner.jsx'
import Alert from '../../components/ui/Alert.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import SessionPaymentGate from '../../components/ui/SessionPaymentGate.jsx'
import { createMultiSeatReservation, addSeatsToBooking } from '../../services/reservationService.js'
import { supabase } from '../../services/supabase.js'
import {
  getTableForSeat,
  getWeeklyLimit,
  MAX_SEATS_PER_BOOKING,
  GUEST_SEAT_RATE_CENTS,
} from '../../lib/businessRules.js'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'

export default function ReservePage() {
  const { id: sessionId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { session, loading: sessionLoading } = useSession(sessionId)
  const { seats, loading: seatsLoading, refreshSeats } = useSeats(sessionId)
  const { reservations } = useUserReservations(user?.id)
  const { checkedInCount, isOverLimit } = useWeeklyLimit(reservations, profile?.membership_type, session?.date ?? null)

  const [selectedSeats,     setSelectedSeats]     = useState([])
  const [showPaymentGate,   setShowPaymentGate]   = useState(false)
  const [maxSeatsMsg,       setMaxSeatsMsg]       = useState(false)
  const [error,             setError]             = useState(null)
  const [success,           setSuccess]           = useState(false)

  // Existing bookings for this session
  const [existingReservations,        setExistingReservations]        = useState([])
  const [existingReservationsLoading, setExistingReservationsLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id || !sessionId) return
    supabase
      .from('reservations')
      .select('id, seat_id, is_primary_seat, group_reservation_id, seats ( seat_number )')
      .eq('user_id', profile.id)
      .eq('session_id', sessionId)
      .in('status', ['confirmed', 'walk_in'])
      .then(({ data }) => {
        setExistingReservations(data ?? [])
        setExistingReservationsLoading(false)
      })
  }, [profile?.id, sessionId])

  // Auto-dismiss max-seats message
  useEffect(() => {
    if (!maxSeatsMsg) return
    const t = setTimeout(() => setMaxSeatsMsg(false), 3000)
    return () => clearTimeout(t)
  }, [maxSeatsMsg])

  const existingSeatCount = existingReservations.length
  const existingSeatIds   = existingReservations.map(r => r.seat_id)
  const remainingSlots    = MAX_SEATS_PER_BOOKING - existingSeatCount
  const isAddingSeats     = existingSeatCount > 0

  const existingPrimary = existingReservations.find(r => r.is_primary_seat)
  const existingGroupId = existingPrimary?.group_reservation_id ?? null

  function handleToggleSeat(seat) {
    setSelectedSeats(prev => {
      const idx = prev.findIndex(s => s.id === seat.id)
      if (idx >= 0) {
        const next = prev.filter(s => s.id !== seat.id)
        if (next.length === 0) setShowPaymentGate(false)
        return next
      }
      if (prev.length >= remainingSlots) {
        setMaxSeatsMsg(true)
        return prev
      }
      return [...prev, seat]
    })
  }

  async function doReserveWithPayment(paymentId) {
    setError(null)
    console.log('[ReservePage] doReserveWithPayment called — paymentId:', paymentId)
    try {
      console.log('[ReservePage] calling createMultiSeatReservation')
      await createMultiSeatReservation({
        userId:           user.id,
        sessionId,
        selectedSeats,
        membershipType:   profile?.membership_type ?? 'four_winds_member',
        isFlaggedOverage: isOverLimit,
        paymentId,
      })
      setSuccess(true)
      console.log('[ReservePage] success set to true')
      setTimeout(() => navigate('/dashboard'), 2500)
    } catch (err) {
      setError(err.message)
      console.error('[ReservePage] reservation failed after payment:', err.message)
      refreshSeats()
      setSelectedSeats([])
      setShowPaymentGate(false)
    }
  }

  async function doAddSeatsWithPayment(paymentId) {
    setError(null)
    try {
      await addSeatsToBooking({
        userId:         user.id,
        sessionId,
        newSeats:       selectedSeats,
        existingGroupId,
        membershipType: profile?.membership_type ?? 'four_winds_member',
        paymentId,
      })
      setSuccess(true)
      setTimeout(() => navigate('/sessions'), 2500)
    } catch (err) {
      setError(err.message)
      refreshSeats()
      setSelectedSeats([])
      setShowPaymentGate(false)
    }
  }

  if (sessionLoading || seatsLoading || existingReservationsLoading) {
    return <PageWrapper><LoadingSpinner /></PageWrapper>
  }

  // Full session guard — only if user has no existing seats either
  const availableSeats = seats.filter(s => s.status === 'available').length
  if (seats.length > 0 && availableSeats === 0 && existingSeatCount === 0) {
    return (
      <PageWrapper>
        <div className="text-center py-20">
          <EmptyState
            title="This session is full"
            description="All seats have been reserved. Check other available sessions."
          />
          <Link
            to="/sessions"
            className="mt-6 inline-block bg-navy text-sky font-sans text-sm rounded-full py-2.5 px-6 hover:bg-navy-deep transition-colors"
          >
            View other sessions
          </Link>
        </div>
      </PageWrapper>
    )
  }

  // No more slots to add
  if (isAddingSeats && remainingSlots === 0) {
    return (
      <PageWrapper>
        <div className="max-w-md mx-auto text-center py-16">
          <div className="bg-white rounded-2xl border border-gold/30 shadow-sm px-6 py-8">
            <p className="font-playfair text-navy text-xl mb-2">You've reached the 4-seat maximum</p>
            <p className="font-cormorant italic text-text-mid text-base mb-6">
              You already have {existingSeatCount} seat{existingSeatCount !== 1 ? 's' : ''} booked for this session.
            </p>
            <Link
              to="/sessions"
              className="inline-block bg-navy text-sky font-sans text-sm rounded-full py-2.5 px-6 hover:bg-navy-deep transition-colors"
            >
              Back to sessions
            </Link>
          </div>
        </div>
      </PageWrapper>
    )
  }

  if (success) {
    return (
      <PageWrapper>
        <div className="max-w-md mx-auto text-center py-16">
          <div className="bg-white rounded-2xl border border-gold/30 shadow-lg p-10">
            <div className="w-16 h-16 rounded-full bg-gold-light flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-playfair text-3xl text-navy mb-2">
              {isAddingSeats ? 'Seats added!' : "You're in!"}
            </h2>
            <p className="font-cormorant italic text-text-mid text-lg mb-6">
              {isAddingSeats
                ? `${selectedSeats.length} more seat${selectedSeats.length !== 1 ? 's' : ''} added to your booking.`
                : selectedSeats.length > 1
                  ? `${selectedSeats.length} seats reserved. We'll see you at the table.`
                  : "Your seat has been reserved. We'll see you at the table."}
            </p>
            {session && (
              <div className="bg-cream rounded-xl p-4 text-left space-y-1">
                <p className="font-playfair text-navy">{formatSessionDate(session.date)}</p>
                <p className="font-sans text-sm text-text-mid">{formatTime(session.start_time)} – {formatTime(session.end_time)}</p>
                {selectedSeats.map(seat => {
                  const info = getTableForSeat(seat.seat_number)
                  return (
                    <p key={seat.id} className="font-sans text-sm text-sky-mid">
                      {info.tableName} · Seat {seat.seat_number}
                    </p>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </PageWrapper>
    )
  }

  const uniqueTableNames = [...new Set(selectedSeats.map(s => getTableForSeat(s.seat_number).tableName))]

  return (
    <PageWrapper noPad>
      {/* Header strip */}
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">
            {isAddingSeats ? 'Add More Seats' : 'Reserve a Seat'}
          </p>
          {session && (
            <>
              <h1 className="font-playfair text-3xl text-sky">{formatSessionDate(session.date)}</h1>
              <p className="font-sans text-sky/70 text-sm mt-1">
                {formatTime(session.start_time)} – {formatTime(session.end_time)}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="bg-cream pb-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Existing booking banner */}
          {isAddingSeats && (
            <FadeUp>
              <div className="bg-gold-light border border-gold/40 rounded-2xl px-4 py-3">
                <p className="font-cormorant italic text-navy text-base">
                  You have {existingSeatCount} seat{existingSeatCount !== 1 ? 's' : ''} booked for this session
                </p>
                <p className="font-cormorant text-navy/70 text-sm">
                  You can add up to {remainingSlots} more
                </p>
              </div>
            </FadeUp>
          )}

          {!isAddingSeats && isOverLimit && (
            <FadeUp>
              <OverageFlagBanner
                checkedInCount={checkedInCount}
                weeklyLimit={getWeeklyLimit(profile?.membership_type) ?? 0}
              />
            </FadeUp>
          )}

          {error && <Alert type="error">{error}</Alert>}

          <FadeUp>
            <SeatMap
              seats={seats}
              selectedSeats={selectedSeats}
              onSelect={handleToggleSeat}
              existingSeatIds={existingSeatIds}
            />
          </FadeUp>

          {/* Max seats message */}
          {maxSeatsMsg && (
            <div className="bg-gold-light border border-gold/30 rounded-xl px-4 py-2.5 text-center">
              <p className="font-sans text-sm text-navy font-medium">
                You've reached the 4-seat maximum for this session
              </p>
            </div>
          )}

          {/* Summary bar — inline on desktop */}
          {selectedSeats.length > 0 && !showPaymentGate && (
            <div className="hidden sm:block bg-white rounded-2xl border border-navy/8 shadow-sm px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-playfair text-navy text-sm font-medium">
                    {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} selected
                  </p>
                  <p className="font-cormorant text-text-mid" style={{ fontSize: '13px' }}>
                    {uniqueTableNames.join(' · ')}
                  </p>
                </div>
                <button
                  onClick={() => setShowPaymentGate(true)}
                  className="flex-shrink-0 px-6 py-2.5 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary bar — fixed on mobile */}
      {selectedSeats.length > 0 && !showPaymentGate && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-warm-white border-t border-navy/10 shadow-xl">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-playfair text-navy text-sm font-medium">
                  {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} selected
                </p>
                <p className="font-cormorant text-text-mid" style={{ fontSize: '13px' }}>
                  {uniqueTableNames.join(' · ')}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentGate(true)}
                className="flex-shrink-0 px-6 py-2.5 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all"
              >
                Continue →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment gate */}
      {showPaymentGate && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-warm-white border-t border-navy/10 shadow-xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
            <SessionPaymentGate
              session={session}
              selectedSeats={selectedSeats}
              profile={profile}
              onPaymentComplete={isAddingSeats ? doAddSeatsWithPayment : doReserveWithPayment}
              onCancel={() => { setShowPaymentGate(false); setError(null) }}
              onPaymentFailed={() => {
                refreshSeats()
                setSelectedSeats([])
                setShowPaymentGate(false)
              }}
              skipDuplicateCheck={isAddingSeats}
              overrideTotalCents={isAddingSeats ? selectedSeats.length * GUEST_SEAT_RATE_CENTS : undefined}
            />
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
