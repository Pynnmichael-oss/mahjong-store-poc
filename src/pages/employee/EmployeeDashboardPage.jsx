import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import SessionSummaryCard from '../../components/employee/SessionSummaryCard.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import { fetchTodaysSessions } from '../../services/sessionService.js'
import { fetchSessionReservations } from '../../services/reservationService.js'
import { fetchUpcomingEvents } from '../../services/eventService.js'

export default function EmployeeDashboardPage() {
  const [sessions, setSessions] = useState([])
  const [reservationsBySession, setReservationsBySession] = useState({})
  const [eventsCount, setEventsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [s, ev] = await Promise.all([fetchTodaysSessions(), fetchUpcomingEvents()])
      setSessions(s)
      setEventsCount(ev.length)
      const map = {}
      await Promise.all(s.map(async sess => {
        map[sess.id] = await fetchSessionReservations(sess.id)
      }))
      setReservationsBySession(map)
      setLoading(false)
    }
    load()
  }, [])

  const allReservations = Object.values(reservationsBySession).flat()
  const totalReserved  = allReservations.filter(r => r.status === 'confirmed').length
  const totalCheckedIn = allReservations.filter(r => r.status === 'checked_in' || r.status === 'walk_in').length
  const totalNoShow    = allReservations.filter(r => r.status === 'no_show').length

  return (
    <PageWrapper noPad>
      {/* Navy hero */}
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Staff Portal</p>
          <h1 className="font-playfair text-3xl text-sky">Employee Dashboard</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Today stats */}
        <FadeUp>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: totalReserved,  label: 'Reserved',   color: 'text-navy'    },
              { value: totalCheckedIn, label: 'Checked In', color: 'text-sky-mid' },
              { value: totalNoShow,    label: 'No Show',    color: 'text-red-500' },
            ].map(({ value, label, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-navy/8 shadow-sm p-5 text-center">
                <p className={`font-playfair text-3xl ${color}`}>{value}</p>
                <p className="font-sans text-xs text-text-soft mt-1">{label}</p>
              </div>
            ))}
          </div>
        </FadeUp>

        {/* Events banner */}
        {eventsCount > 0 && (
          <FadeUp delay={50}>
            <div className="bg-white rounded-2xl border border-gold/30 shadow-sm p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-playfair text-navy text-lg">
                  {eventsCount} upcoming event{eventsCount !== 1 ? 's' : ''}
                </p>
                <p className="font-cormorant italic text-text-mid">Members are RSVPing</p>
              </div>
              <Link
                to="/employee/events"
                className="flex-shrink-0 px-5 py-2 rounded-full font-sans text-sm font-medium bg-navy text-sky hover:bg-navy-deep transition-all"
              >
                Manage Events →
              </Link>
            </div>
          </FadeUp>
        )}

        {/* Today's sessions */}
        <FadeUp delay={100}>
          <h2 className="font-playfair text-xl text-navy mb-4">
            Today's <em className="text-sky-mid">Sessions</em>
          </h2>
          {loading ? (
            <LoadingSpinner />
          ) : sessions.length === 0 ? (
            <EmptyState message="No sessions scheduled today." />
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
        </FadeUp>

      </div>
    </PageWrapper>
  )
}
