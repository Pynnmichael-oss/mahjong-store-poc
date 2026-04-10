import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import SessionSummaryCard from '../../components/employee/SessionSummaryCard.jsx'
import SessionCreateModal from '../../components/employee/SessionCreateModal.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Alert from '../../components/ui/Alert.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { fetchSessionsInRange } from '../../services/sessionService.js'
import { fetchSessionReservations } from '../../services/reservationService.js'
import { fetchUpcomingEvents } from '../../services/eventService.js'
import { formatSessionDate } from '../../lib/dateUtils.js'

function addDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function greeting(name) {
  const h = new Date().getHours()
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return `Good ${time}${name ? `, ${name.split(' ')[0]}` : ''}`
}

function longDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

// ─── Quick link cards ─────────────────────────────────────────────────────────
const QUICK_LINKS = [
  { to: '/employee/members', label: 'Members', icon: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.768-.231-1.48-.634-2.083m0 0A5.974 5.974 0 0112 14c-2.21 0-4.135 1.197-5.214 2.917M7 20v-2a3 3 0 015.214-2.917m0 0A5.963 5.963 0 0012 14m0 0a6 6 0 100-12 6 6 0 000 12z" /></svg>
  )},
  { to: '/employee/reports', label: 'Reports', icon: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
  )},
  { to: '/employee/events', label: 'Events', icon: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  )},
]

export default function EmployeeDashboardPage() {
  const { user, profile, isEmployee, loading: authLoading } = useAuth()

  const [sessions, setSessions]                     = useState([])
  const [reservationsBySession, setReservationsBySession] = useState({})
  const [eventsCount, setEventsCount]               = useState(0)
  const [dataLoading, setDataLoading]               = useState(true)
  const [loadError, setLoadError]                   = useState(null)
  const [showCreate, setShowCreate]                 = useState(false)

  // Redirect non-employees once auth is resolved
  if (!authLoading && !isEmployee) return <Navigate to="/dashboard" replace />

  async function loadData() {
    setDataLoading(true)
    setLoadError(null)
    try {
      const today   = addDays(0)
      const weekOut = addDays(7)
      const [weekSessions, ev] = await Promise.all([
        fetchSessionsInRange(today, weekOut),
        fetchUpcomingEvents(),
      ])
      setSessions(weekSessions)
      setEventsCount(ev.length)
      const map = {}
      await Promise.all(weekSessions.map(async sess => {
        map[sess.id] = await fetchSessionReservations(sess.id)
      }))
      setReservationsBySession(map)
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setDataLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Spinner until both auth AND data are ready
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const today = addDays(0)
  const todaySessions = sessions.filter(s => s.date === today)

  // Today's stats
  const todayReservations = todaySessions.flatMap(s => reservationsBySession[s.id] ?? [])
  const totalReserved  = todayReservations.filter(r => r.status === 'confirmed').length
  const totalCheckedIn = todayReservations.filter(r => r.status === 'checked_in' || r.status === 'walk_in').length
  const totalNoShow    = todayReservations.filter(r => r.status === 'no_show').length
  const totalCapacity  = todaySessions.reduce((a, s) => a + (s.total_seats ?? 32), 0)
  const openSeats      = totalCapacity - totalReserved - totalCheckedIn

  // Group sessions by date
  const byDate = sessions.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {})

  const statCards = [
    { value: totalReserved,  label: 'Reserved Today',   color: 'text-navy'    },
    { value: totalCheckedIn, label: 'Checked In',        color: 'text-sky-mid' },
    { value: totalNoShow,    label: 'No Shows',          color: 'text-red-500' },
    { value: Math.max(openSeats, 0), label: 'Open Seats', color: 'text-gold'  },
  ]

  return (
    <PageWrapper noPad>
      {/* Navy hero */}
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Staff Portal</p>
          <h1 className="font-playfair text-3xl text-sky">{greeting(profile?.full_name)}</h1>
          <p className="font-cormorant italic text-sky/60 text-lg mt-1">{longDate()}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {loadError && <Alert type="error">Failed to load dashboard: {loadError}</Alert>}

        {/* Stat cards */}
        <FadeUp>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statCards.map(({ value, label, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-navy/8 shadow-sm p-5 text-center">
                <p className={`font-playfair text-4xl ${color}`}>{value}</p>
                <p className="font-sans text-xs text-text-soft mt-1">{label}</p>
              </div>
            ))}
          </div>
        </FadeUp>

        {/* Events banner */}
        {eventsCount > 0 && (
          <FadeUp>
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

        {/* This week's sessions */}
        <FadeUp>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-playfair text-xl text-navy">
              This Week's <em className="text-sky-mid">Sessions</em>
            </h2>
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 rounded-full font-sans text-sm font-medium bg-navy text-sky hover:bg-navy-deep transition-all"
            >
              + Add Session
            </button>
          </div>

          {sessions.length === 0 ? (
            <EmptyState message="No sessions this week. Add one above." />
          ) : (
            <div className="space-y-8">
              {Object.entries(byDate).map(([date, daySessions]) => (
                <div key={date}>
                  <p className="font-sans text-[11px] uppercase tracking-[3px] text-text-soft mb-3 px-1">
                    {date === today ? 'Today — ' : ''}{formatSessionDate(date)}
                  </p>
                  <div className="space-y-4">
                    {daySessions.map(s => (
                      <SessionSummaryCard
                        key={s.id}
                        session={s}
                        reservations={reservationsBySession[s.id] ?? []}
                        onCancelled={loadData}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </FadeUp>

        {/* Quick links */}
        <FadeUp>
          <h2 className="font-playfair text-xl text-navy mb-4">Quick Links</h2>
          <div className="grid grid-cols-3 gap-4">
            {QUICK_LINKS.map(({ to, label, icon }) => (
              <Link
                key={to}
                to={to}
                className="bg-white rounded-2xl border border-navy/8 shadow-sm p-6 flex flex-col items-center gap-3 text-navy hover:shadow-md hover:-translate-y-1 transition-all duration-200"
              >
                <span className="text-sky-mid">{icon}</span>
                <span className="font-sans text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </FadeUp>

      </div>

      <SessionCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadData}
      />
    </PageWrapper>
  )
}
