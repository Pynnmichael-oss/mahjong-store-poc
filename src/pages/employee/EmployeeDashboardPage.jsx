import { useEffect, useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import SessionSummaryCard from '../../components/employee/SessionSummaryCard.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import { fetchTodaysSessions } from '../../services/sessionService.js'
import { fetchSessionReservations } from '../../services/reservationService.js'

export default function EmployeeDashboardPage() {
  const [sessions, setSessions] = useState([])
  const [reservationsBySession, setReservationsBySession] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const todaysSessions = await fetchTodaysSessions()
      setSessions(todaysSessions)
      const map = {}
      await Promise.all(
        todaysSessions.map(async s => {
          const res = await fetchSessionReservations(s.id)
          map[s.id] = res
        })
      )
      setReservationsBySession(map)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <PageWrapper title="Today's Sessions">
      {loading ? (
        <LoadingSpinner />
      ) : sessions.length === 0 ? (
        <EmptyState title="No sessions today" description="There are no sessions scheduled for today." />
      ) : (
        <div className="space-y-4">
          {sessions.map(s => (
            <SessionSummaryCard
              key={s.id}
              session={s}
              reservations={reservationsBySession[s.id] ?? []}
            />
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
