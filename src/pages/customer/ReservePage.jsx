import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSession } from '../../hooks/useSessions.js'
import { useSeats } from '../../hooks/useSeats.js'
import { useUserReservations } from '../../hooks/useReservations.js'
import { useWeeklyLimit } from '../../hooks/useWeeklyLimit.js'
import SeatMap from '../../components/seats/SeatMap.jsx'
import OverageFlagBanner from '../../components/reservations/OverageFlagBanner.jsx'
import Alert from '../../components/ui/Alert.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import { createReservation } from '../../services/reservationService.js'
import { buildReservationPayload, getTableForSeat } from '../../lib/businessRules.js'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'

export default function ReservePage() {
  const { id: sessionId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { session, loading: sessionLoading } = useSession(sessionId)
  const { seats, loading: seatsLoading, refreshSeats } = useSeats(sessionId)
  const { reservations } = useUserReservations(user?.id)
  const { checkedInCount, isOverLimit } = useWeeklyLimit(reservations, profile?.membership_type)

  const [selectedSeat, setSelectedSeat] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleReserve() {
    if (!selectedSeat) return
    setSubmitting(true); setError(null)
    try {
      const payload = buildReservationPayload({
        userId: user.id, sessionId,
        seatId: selectedSeat.id,
        membershipType: profile?.membership_type ?? 'walk_in',
        isFlaggedOverage: isOverLimit,
      })
      await createReservation(payload)
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2500)
    } catch (err) {
      setError(err.message)
      refreshSeats()
      setSelectedSeat(null)
    } finally {
      setSubmitting(false)
    }
  }

  if (sessionLoading || seatsLoading) {
    return <PageWrapper><LoadingSpinner /></PageWrapper>
  }

  const tableInfo = selectedSeat ? getTableForSeat(selectedSeat.seat_number) : null

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
            <h2 className="font-playfair text-3xl text-navy mb-2">You're in!</h2>
            <p className="font-cormorant italic text-text-mid text-lg mb-6">
              Your seat has been reserved. We'll see you at the table.
            </p>
            {session && (
              <div className="bg-cream rounded-xl p-4 text-left">
                <p className="font-playfair text-navy">{formatSessionDate(session.date)}</p>
                <p className="font-sans text-sm text-text-mid mt-1">{formatTime(session.start_time)} – {formatTime(session.end_time)}</p>
                {tableInfo && (
                  <p className="font-sans text-sm text-sky-mid mt-1">{tableInfo.tableName} Table · Seat {selectedSeat.seat_number}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper noPad>
      {/* Header strip */}
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Reserve a Seat</p>
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
          {isOverLimit && profile?.membership_type === 'subscriber' && (
            <FadeUp><OverageFlagBanner checkedInCount={checkedInCount} /></FadeUp>
          )}
          {error && <Alert type="error">{error}</Alert>}

          <FadeUp>
            <SeatMap seats={seats} selectedSeat={selectedSeat} onSelect={setSelectedSeat} />
          </FadeUp>
        </div>
      </div>

      {/* Sticky confirmation panel */}
      {selectedSeat && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-warm-white border-t border-navy/10 shadow-xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-playfair text-navy text-lg">
                {tableInfo?.tableName} Table · Seat {selectedSeat.seat_number}
              </p>
              {session && (
                <p className="font-sans text-xs text-text-soft mt-0.5">
                  {formatTime(session.start_time)} – {formatTime(session.end_time)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setSelectedSeat(null)}
                className="font-sans text-sm text-text-soft hover:text-navy transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReserve}
                disabled={submitting}
                className="px-6 py-3 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50"
              >
                {submitting ? 'Reserving...' : 'Confirm Reservation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
