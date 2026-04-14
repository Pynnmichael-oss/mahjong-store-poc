import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import SessionCreateModal from '../../components/employee/SessionCreateModal.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Alert from '../../components/ui/Alert.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import { fetchSessionsInRange } from '../../services/sessionService.js'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'

function addDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export default function EmployeeSessionsPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  async function load() {
    setLoading(true)
    setError(null)
    try {
      // Fetch 60 days of sessions: 7 days back so cancelled sessions are visible
      const data = await fetchSessionsInRange(addDays(-7), addDays(60))
      console.log('[EmployeeSessionsPage] fetched', data.length, 'sessions | loading → false')
      setSessions(data)
    } catch (err) {
      console.error('[EmployeeSessionsPage] fetch error:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('[EmployeeSessionsPage] mount — starting fetch')
    load()
  }, [])

  return (
    <PageWrapper noPad>
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Staff Portal</p>
            <h1 className="font-playfair text-3xl text-sky">All Sessions</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-full font-sans text-sm font-medium bg-white/10 text-sky border border-sky/20 hover:bg-white/20 transition-all"
          >
            + Add Session
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : error ? (
          <Alert type="error">Failed to load sessions: {error}</Alert>
        ) : sessions.length === 0 ? (
          <EmptyState message="No sessions scheduled. Use + Add Session to create one." />
        ) : (
          <FadeUp>
            <div className="space-y-3">
              {sessions.map(s => {
                const isToday = s.date === today
                return (
                  <div
                    key={s.id}
                    className={`bg-white rounded-2xl border border-navy/8 shadow-sm p-5 flex items-center justify-between gap-4 ${isToday ? 'border-l-4 border-l-gold' : ''}`}
                  >
                    <div>
                      <p className="font-sans text-[10px] uppercase tracking-[3px] text-sky-mid mb-0.5">
                        {isToday ? 'Today' : ''}
                      </p>
                      <p className="font-playfair text-navy text-lg">{formatSessionDate(s.date)}</p>
                      <p className="font-sans text-sm text-text-mid mt-0.5">
                        {formatTime(s.start_time)} – {formatTime(s.end_time)}
                      </p>
                      <div className="mt-2"><Badge status={s.status} /></div>
                    </div>
                    <Link
                      to={`/employee/sessions/${s.id}`}
                      className="flex-shrink-0 px-4 py-2 rounded-full font-sans text-sm font-medium border border-navy/20 text-navy hover:bg-sky-pale transition-all"
                    >
                      Manage →
                    </Link>
                  </div>
                )
              })}
            </div>
          </FadeUp>
        )}
      </div>

      <SessionCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load() }}
      />
    </PageWrapper>
  )
}
