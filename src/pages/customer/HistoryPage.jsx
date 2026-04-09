import PageWrapper from '../../components/layout/PageWrapper.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useUserReservations } from '../../hooks/useReservations.js'
import Badge from '../../components/ui/Badge.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import { getTableForSeat } from '../../lib/businessRules.js'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'

export default function HistoryPage() {
  const { user } = useAuth()
  const { reservations, loading } = useUserReservations(user?.id)

  const sorted = [...reservations].sort((a, b) =>
    new Date(b.reserved_at) - new Date(a.reserved_at)
  )

  return (
    <PageWrapper noPad>
      {/* Navy header */}
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Member History</p>
          <h1 className="font-playfair text-3xl text-sky">My Sessions</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <LoadingSpinner />
        ) : sorted.length === 0 ? (
          <EmptyState message="No check-ins recorded yet. See you at the table." />
        ) : (
          <FadeUp>
            <div className="bg-white rounded-2xl border border-navy/8 shadow-sm overflow-hidden">
              {sorted.map((r, i) => {
                const session = r.sessions
                const seat = r.seats
                const tableInfo = seat ? getTableForSeat(seat.seat_number) : null
                const isAlt = i % 2 === 1

                return (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between gap-4 px-5 py-4 border-b border-navy/5 last:border-0 ${isAlt ? 'bg-sky-pale' : 'bg-white'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-playfair text-navy text-base leading-tight">
                        {session ? formatSessionDate(session.date) : '—'}
                      </p>
                      <p className="font-sans text-sm text-text-mid mt-0.5">
                        {session ? `${formatTime(session.start_time)} – ${formatTime(session.end_time)}` : ''}
                      </p>
                      {tableInfo && (
                        <p className="font-sans text-xs text-text-soft mt-0.5">
                          {tableInfo.tableName} Table · Seat {seat.seat_number}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <Badge status={r.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          </FadeUp>
        )}
      </div>
    </PageWrapper>
  )
}
