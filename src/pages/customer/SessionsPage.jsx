import { useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import SessionList from '../../components/sessions/SessionList.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import Alert from '../../components/ui/Alert.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import { useSessions } from '../../hooks/useSessions.js'

export default function SessionsPage() {
  const { sessions, loading, error } = useSessions()
  const [filter, setFilter] = useState('all')

  const today = new Date().toISOString().split('T')[0]
  const weekEnd = new Date()
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  const filtered = sessions.filter(s => {
    if (filter === 'today') return s.date === today
    if (filter === 'week') return s.date >= today && s.date <= weekEndStr
    return true
  })

  return (
    <PageWrapper noPad>
      {/* Navy header strip */}
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Open Play</p>
          <h1 className="font-playfair text-3xl text-sky">
            Sessions
          </h1>
        </div>
      </div>

      <div className="bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Filter pills */}
          <div className="flex gap-2 mb-6">
            {[
              { key: 'all',   label: 'All Upcoming' },
              { key: 'today', label: 'Today'         },
              { key: 'week',  label: 'This Week'     },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-5 py-2 rounded-full font-sans text-sm font-medium transition-all duration-150 ${
                  filter === key
                    ? 'bg-navy text-sky'
                    : 'bg-white border border-navy/20 text-navy hover:bg-sky-pale'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <FadeUp>
            {loading && <LoadingSpinner />}
            {error && <Alert type="error">{error.message}</Alert>}
            {!loading && !error && <SessionList sessions={filtered} showReserveButton />}
          </FadeUp>
        </div>
      </div>
    </PageWrapper>
  )
}
