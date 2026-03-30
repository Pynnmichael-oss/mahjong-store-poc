import PageWrapper from '../../components/layout/PageWrapper.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useUserReservations } from '../../hooks/useReservations.js'
import ReservationSummary from '../../components/reservations/ReservationSummary.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'

export default function HistoryPage() {
  const { user } = useAuth()
  const { reservations, loading } = useUserReservations(user?.id)

  const past = reservations.filter(r =>
    !['confirmed'].includes(r.status) ||
    (r.sessions?.date ?? '') < new Date().toISOString().split('T')[0]
  )

  return (
    <PageWrapper title="Reservation History">
      {loading ? (
        <LoadingSpinner />
      ) : past.length === 0 ? (
        <EmptyState title="No history yet" description="Your past reservations will appear here." />
      ) : (
        <div className="space-y-3">
          {past.map(r => <ReservationSummary key={r.id} reservation={r} />)}
        </div>
      )}
    </PageWrapper>
  )
}
