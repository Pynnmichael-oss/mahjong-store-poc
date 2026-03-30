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
import Button from '../../components/ui/Button.jsx'
import Alert from '../../components/ui/Alert.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import { createReservation } from '../../services/reservationService.js'
import { buildReservationPayload } from '../../lib/businessRules.js'
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
    setSubmitting(true)
    setError(null)
    try {
      const payload = buildReservationPayload({
        userId: user.id,
        sessionId,
        seatId: selectedSeat.id,
        membershipType: profile?.membership_type ?? 'walk_in',
        isFlaggedOverage: isOverLimit,
      })
      await createReservation(payload)
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (err) {
      setError(err.message)
      refreshSeats()
      setSelectedSeat(null)
    } finally {
      setSubmitting(false)
    }
  }

  if (sessionLoading || seatsLoading) return <PageWrapper><LoadingSpinner /></PageWrapper>

  return (
    <PageWrapper title="Reserve a Seat">
      {session && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="font-semibold text-gray-900">{formatSessionDate(session.date)}</div>
          <div className="text-sm text-gray-500">{formatTime(session.start_time)} – {formatTime(session.end_time)}</div>
        </div>
      )}

      {isOverLimit && profile?.membership_type === 'subscriber' && (
        <div className="mb-4">
          <OverageFlagBanner checkedInCount={checkedInCount} />
        </div>
      )}

      {error && <Alert type="error" className="mb-4">{error}</Alert>}
      {success && <Alert type="success" className="mb-4">Reservation confirmed! Redirecting...</Alert>}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h2 className="font-medium text-gray-900 mb-3">Select a Seat</h2>
        <SeatMap seats={seats} selectedSeat={selectedSeat} onSelect={setSelectedSeat} />
      </div>

      {selectedSeat && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-sm font-medium text-blue-800">Seat #{selectedSeat.seat_number} selected</div>
          <Button onClick={handleReserve} disabled={submitting}>
            {submitting ? 'Reserving...' : 'Confirm Reservation'}
          </Button>
        </div>
      )}
    </PageWrapper>
  )
}
