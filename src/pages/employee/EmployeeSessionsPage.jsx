import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Badge from '../../components/ui/Badge.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import { supabase } from '../../services/supabase.js'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'

export default function EmployeeSessionsPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('sessions')
      .select('*')
      .order('date', { ascending: false })
      .order('start_time', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setSessions(data || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toISOString().split('T')[0]

  return (
    <PageWrapper noPad>
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Staff Portal</p>
          <h1 className="font-playfair text-3xl text-sky">All Sessions</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="font-sans text-red-600 text-sm">{error}</p>
        ) : sessions.length === 0 ? (
          <EmptyState message="No sessions found." />
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
    </PageWrapper>
  )
}
