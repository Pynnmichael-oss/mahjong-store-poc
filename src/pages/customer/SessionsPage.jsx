import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import CustomerHeader from '../../components/layout/CustomerHeader.jsx'
import SessionList from '../../components/sessions/SessionList.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import Alert from '../../components/ui/Alert.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import CancelReservationModal from '../../components/ui/CancelReservationModal.jsx'
import { useSessions } from '../../hooks/useSessions.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../services/supabase.js'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'
import { getTableForSeat, MAX_SEATS_PER_BOOKING } from '../../lib/businessRules.js'

export default function SessionsPage() {
  const { sessions, loading, error } = useSessions()
  const { user, profile } = useAuth()
  const [filter, setFilter] = useState('all')
  const [showWelcome, setShowWelcome] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const weekEnd = new Date()
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  // Upcoming booked sessions
  const [upcomingBookings,       setUpcomingBookings]       = useState([])
  const [upcomingLoading,        setUpcomingLoading]        = useState(true)
  const [cancelModal,            setCancelModal]            = useState(null)  // { reservationId, groupId, sessionInfo, totalSeats }

  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('reservations')
      .select(`
        id, seat_id, status, group_reservation_id,
        is_primary_seat, guest_count, session_id,
        sessions!inner ( id, date, start_time, end_time ),
        seats ( seat_number )
      `)
      .eq('user_id', profile.id)
      .in('status', ['confirmed', 'walk_in'])
      .gte('sessions.date', today)
      .then(({ data }) => {
        // Group all reservations by session_id; track primary + total count
        const map = {}
        for (const r of (data ?? [])) {
          const sid = r.session_id
          if (!map[sid]) map[sid] = { primary: null, total: 0, sessionObj: r.sessions }
          map[sid].total++
          if (r.is_primary_seat) map[sid].primary = r
        }
        const sorted = Object.values(map)
          .filter(b => b.primary)
          .sort((a, b) => ((a.sessionObj?.date ?? '') < (b.sessionObj?.date ?? '') ? -1 : 1))
        setUpcomingBookings(sorted)
        setUpcomingLoading(false)
      })
  }, [profile?.id, today]) // eslint-disable-line react-hooks/exhaustive-deps

  function refreshUpcoming() {
    if (!profile?.id) return
    setUpcomingLoading(true)
    supabase
      .from('reservations')
      .select(`
        id, seat_id, status, group_reservation_id,
        is_primary_seat, guest_count, session_id,
        sessions!inner ( id, date, start_time, end_time ),
        seats ( seat_number )
      `)
      .eq('user_id', profile.id)
      .in('status', ['confirmed', 'walk_in'])
      .gte('sessions.date', today)
      .then(({ data }) => {
        const map = {}
        for (const r of (data ?? [])) {
          const sid = r.session_id
          if (!map[sid]) map[sid] = { primary: null, total: 0, sessionObj: r.sessions }
          map[sid].total++
          if (r.is_primary_seat) map[sid].primary = r
        }
        const sorted = Object.values(map)
          .filter(b => b.primary)
          .sort((a, b) => ((a.sessionObj?.date ?? '') < (b.sessionObj?.date ?? '') ? -1 : 1))
        setUpcomingBookings(sorted)
        setUpcomingLoading(false)
      })
  }

  useEffect(() => {
    if (!user?.created_at) return
    if (sessionStorage.getItem('welcomeShown')) return
    const ageMs = Date.now() - new Date(user.created_at).getTime()
    if (ageMs < 5 * 60 * 1000) {
      setShowWelcome(true)
      sessionStorage.setItem('welcomeShown', 'true')
    }
  }, [user?.created_at])

  const filtered = sessions.filter(s => {
    if (filter === 'today') return s.date === today
    if (filter === 'week') return s.date >= today && s.date <= weekEndStr
    return true
  })

  return (
    <PageWrapper noPad>
      <CustomerHeader />
      {/* Navy header strip */}
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Open Play</p>
          <h1 className="font-playfair text-3xl text-sky">Sessions</h1>
        </div>
      </div>

      <div className="bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Welcome banner for new members */}
          {showWelcome && (
            <div className="relative bg-gold-light border border-gold/30 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
              <span className="text-gold text-xl mt-0.5 flex-shrink-0">✦</span>
              <div className="flex-1">
                <p className="font-playfair text-navy text-lg leading-snug">Welcome to Four Winds</p>
                <p className="font-cormorant italic text-text-mid text-base mt-0.5">
                  Your membership is active. Reserve a seat below to join your first session.
                </p>
              </div>
              <button
                onClick={() => setShowWelcome(false)}
                className="flex-shrink-0 text-text-soft hover:text-navy transition-colors mt-0.5"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* My upcoming sessions */}
          {!upcomingLoading && upcomingBookings.length > 0 && (
            <FadeUp>
              <div className="mb-8">
                <p className="font-sans text-[11px] uppercase tracking-[4px] text-text-soft mb-3">
                  My Upcoming Sessions
                </p>
                <div className="space-y-3">
                  {upcomingBookings.map(({ primary, total, sessionObj }) => {
                    const seatInfo = primary.seats ? getTableForSeat(primary.seats.seat_number) : null
                    const canAddSeats = total < MAX_SEATS_PER_BOOKING
                    return (
                      <div key={primary.id} className="bg-white rounded-2xl border border-navy/8 shadow-sm px-5 py-4">
                        <p className="font-playfair text-navy text-lg">
                          {formatSessionDate(sessionObj?.date)}
                        </p>
                        <p className="font-cormorant italic text-text-mid text-base">
                          {formatTime(sessionObj?.start_time)} – {formatTime(sessionObj?.end_time)}
                        </p>
                        {seatInfo && primary.seats && (
                          <p className="font-cormorant italic text-text-mid text-sm mt-0.5">
                            {seatInfo.tableName} · Seat {primary.seats.seat_number}
                            {total > 1 && ` +${total - 1} guest${total - 1 !== 1 ? 's' : ''}`}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-3">
                          {canAddSeats && (
                            <Link
                              to={`/sessions/${sessionObj.id}/reserve`}
                              className="font-sans text-xs font-medium text-sky-mid hover:text-navy transition-colors"
                            >
                              + Add seats
                            </Link>
                          )}
                          <button
                            onClick={() => setCancelModal({
                              reservationId: primary.id,
                              groupId:       primary.group_reservation_id,
                              sessionInfo:   sessionObj,
                              totalSeats:    total,
                            })}
                            className="font-sans text-xs text-text-soft hover:text-navy transition-colors"
                          >
                            Cancel reservation →
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </FadeUp>
          )}

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
            {!loading && !error && (
              <SessionList
                sessions={filtered}
                showReserveButton
                bookedSessionIds={upcomingBookings.map(b => b.sessionObj?.id).filter(Boolean)}
              />
            )}
          </FadeUp>
        </div>
      </div>

      {/* Cancel reservation modal */}
      {cancelModal && (
        <CancelReservationModal
          reservationId={cancelModal.reservationId}
          groupId={cancelModal.groupId}
          sessionInfo={cancelModal.sessionInfo}
          totalSeats={cancelModal.totalSeats}
          onConfirm={() => {
            setCancelModal(null)
            refreshUpcoming()
          }}
          onClose={() => setCancelModal(null)}
        />
      )}
    </PageWrapper>
  )
}
