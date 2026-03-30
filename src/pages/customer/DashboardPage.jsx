import { Link } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useUserReservations } from '../../hooks/useReservations.js'
import ReservationSummary from '../../components/reservations/ReservationSummary.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Button from '../../components/ui/Button.jsx'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { reservations, loading } = useUserReservations(user?.id)

  const upcoming = reservations.filter(r =>
    ['confirmed', 'checked_in'].includes(r.status) &&
    r.sessions?.date >= new Date().toISOString().split('T')[0]
  )

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {profile?.full_name?.split(' ')[0] ?? 'there'}!</h1>
        <p className="text-gray-500 text-sm mt-1 capitalize">{profile?.membership_type?.replace('_', ' ')} member</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Link to="/sessions" className="block">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-blue-300 transition-colors">
            <div className="text-2xl mb-1">🎮</div>
            <div className="text-sm font-medium text-gray-700">Browse Sessions</div>
          </div>
        </Link>
        <Link to="/my-qr" className="block">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-blue-300 transition-colors">
            <div className="text-2xl mb-1">📱</div>
            <div className="text-sm font-medium text-gray-700">My QR Code</div>
          </div>
        </Link>
        <Link to="/history" className="block">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-blue-300 transition-colors">
            <div className="text-2xl mb-1">📋</div>
            <div className="text-sm font-medium text-gray-700">History</div>
          </div>
        </Link>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Upcoming Reservations</h2>
      {loading ? (
        <LoadingSpinner />
      ) : upcoming.length === 0 ? (
        <EmptyState
          title="No upcoming reservations"
          description="Browse open sessions and reserve a seat."
          action={<Link to="/sessions"><Button>Browse Sessions</Button></Link>}
        />
      ) : (
        <div className="space-y-3">
          {upcoming.map(r => <ReservationSummary key={r.id} reservation={r} />)}
        </div>
      )}
    </PageWrapper>
  )
}
