import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useGuestBooking } from '../hooks/useGuestBooking.js'
import { useSeats } from '../hooks/useSeats.js'
import FloatingTiles from '../components/layout/FloatingTiles.jsx'
import SeatMap from '../components/seats/SeatMap.jsx'
import Alert from '../components/ui/Alert.jsx'
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx'
import FadeUp from '../components/ui/FadeUp.jsx'
import { supabase } from '../services/supabase.js'
import { formatSessionDate, formatTime } from '../lib/dateUtils.js'

// ─── Session picker ──────────────────────────────────────────────────────────

function SessionCard({ session, selected, onSelect }) {
  const today = new Date().toISOString().split('T')[0]
  const isToday = session.date === today
  const remaining = (session.total_seats ?? 32) - (session.reserved_count ?? 0)
  const isFull = remaining <= 0

  return (
    <button
      onClick={() => !isFull && onSelect(session)}
      disabled={isFull}
      className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
        selected
          ? 'border-navy bg-sky-pale shadow-md'
          : isFull
          ? 'border-navy/10 bg-gray-50 opacity-60 cursor-not-allowed'
          : 'border-navy/10 bg-white hover:border-navy/30 hover:shadow-sm cursor-pointer'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-sans text-[11px] uppercase tracking-[3px] text-sky-mid mb-0.5">
            {isToday ? 'Today' : formatSessionDate(session.date).split(',')[0]}
          </p>
          <p className="font-playfair text-lg text-navy leading-tight">
            {formatSessionDate(session.date)}
          </p>
          <p className="font-sans text-sm text-text-mid mt-0.5">
            {formatTime(session.start_time)} – {formatTime(session.end_time)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`font-sans text-xs px-3 py-1 rounded-full ${
            isFull
              ? 'bg-red-100 text-red-700'
              : remaining <= 4
              ? 'bg-gold-light text-navy'
              : 'bg-sky-light text-navy'
          }`}>
            {isFull ? 'Full' : `${remaining} left`}
          </span>
          {selected && (
            <span className="w-6 h-6 rounded-full bg-gold flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Seat step wrapper (fetches seats for selected session) ──────────────────

function SeatStep({ session, selectedSeat, onSelect }) {
  const { seats, loading } = useSeats(session?.id)
  if (loading) return <LoadingSpinner />
  return (
    <SeatMap
      seats={seats}
      selectedSeat={selectedSeat}
      onSelect={onSelect}
    />
  )
}

// ─── Confirmation card ───────────────────────────────────────────────────────

function ConfirmationCard({ confirmation, onReset }) {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl border-t-4 border-gold shadow-xl p-8 text-center">
        <h2 className="font-playfair text-3xl text-navy mb-1">You're booked!</h2>
        <p className="font-cormorant italic text-text-mid text-lg mb-6">
          Show this screen when you arrive
        </p>

        <div className="bg-cream rounded-xl p-5 text-left space-y-3 mb-6">
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">Date &amp; Time</p>
            <p className="font-playfair text-navy text-lg mt-0.5">{confirmation.sessionDate}</p>
            <p className="font-sans text-sm text-text-mid">{confirmation.sessionTime}</p>
          </div>
          <div className="border-t border-navy/8 pt-3">
            <p className="font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">Your Seat</p>
            <p className="font-playfair text-navy text-lg mt-0.5">
              {confirmation.tableName} · Seat {confirmation.seatNumber}
            </p>
          </div>
          <div className="border-t border-navy/8 pt-3">
            <p className="font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">Name</p>
            <p className="font-playfair text-navy text-lg mt-0.5">{confirmation.guestName}</p>
          </div>
        </div>

        <p className="font-sans text-xs text-text-soft mb-6">
          Walk-in fee collected at the door
        </p>

        <button
          onClick={onReset}
          className="w-full py-3 rounded-full font-sans font-medium text-sm border border-navy/20 text-navy hover:bg-sky-pale transition-all"
        >
          Book Another Session
        </button>
      </div>
    </div>
  )
}

// ─── Main LandingPage ────────────────────────────────────────────────────────

export default function LandingPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const bookingRef = useRef(null)

  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)

  const {
    step, selectedSession, selectedSeat,
    guestName, setGuestName, guestPhone, setGuestPhone,
    loading, error, confirmation,
    selectSession, selectSeat, backToSessions, backToSeats,
    submitBooking, reset,
  } = useGuestBooking()

  // Redirect logged-in users
  useEffect(() => {
    if (!authLoading && user) {
      navigate(profile?.role === 'employee' ? '/employee' : '/dashboard', { replace: true })
    }
  }, [user, profile, authLoading, navigate])

  // Fetch upcoming sessions (public)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const weekOut = new Date()
    weekOut.setDate(weekOut.getDate() + 7)
    const weekOutStr = weekOut.toISOString().split('T')[0]

    supabase
      .from('sessions')
      .select('*')
      .gte('date', today)
      .lte('date', weekOutStr)
      .eq('status', 'open')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .then(({ data }) => { setSessions(data || []); setSessionsLoading(false) })
  }, [])

  function scrollToBooking() {
    bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleSelectSeat(seat) {
    selectSeat(seat)
    // On mobile, scroll down to the form
    setTimeout(() => {
      bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <LoadingSpinner color="sky" />
      </div>
    )
  }

  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc, s) => {
    const key = s.date
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  const inputCls = 'w-full bg-white border border-navy/20 rounded-full px-5 py-3 font-sans text-base text-navy placeholder:text-text-soft focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy/40 transition-all'

  return (
    <div className="min-h-screen bg-warm-white">

      {/* ── Hero ── */}
      <section className="relative bg-navy min-h-[60vh] flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
        <FloatingTiles />
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <p className="font-sans text-[11px] uppercase tracking-[5px] text-sky/50 mb-4">
            Coming soon · Tulsa, Oklahoma
          </p>
          <h1 className="font-playfair text-5xl sm:text-6xl text-sky mb-3">
            Four Winds
          </h1>
          <p className="font-cormorant italic text-sky/70 text-2xl sm:text-3xl mb-10">
            Mahjong Club &amp; Event Space
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={scrollToBooking}
              className="px-8 py-4 rounded-full font-sans font-medium text-base bg-sky text-navy hover:bg-sky/80 transition-all duration-200 shadow-lg"
            >
              Book a Walk-In Session
            </button>
            <Link
              to="/login"
              className="px-8 py-4 rounded-full font-sans font-medium text-base border-[1.5px] border-sky text-sky hover:bg-sky/10 transition-all duration-200"
            >
              Member Login
            </Link>
          </div>
        </div>
      </section>

      {/* ── Walk-in Booking ── */}
      <section ref={bookingRef} className="bg-cream px-4 py-14">
        <div className="max-w-3xl mx-auto">

          {step === 'confirmed' ? (
            <FadeUp>
              <ConfirmationCard confirmation={confirmation} onReset={reset} />
            </FadeUp>
          ) : (
            <>
              <FadeUp>
                <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky-mid mb-2 text-center">
                  Walk-in Booking
                </p>
                <h2 className="font-playfair text-3xl text-navy text-center mb-10">
                  Book Your <em className="text-sky-mid">Seat</em>
                </h2>
              </FadeUp>

              {/* Step 1 — Pick a session */}
              <FadeUp delay={50}>
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center font-sans text-xs font-medium flex-shrink-0 ${step >= 1 ? 'bg-navy text-sky' : 'bg-navy/10 text-text-soft'}`}>1</span>
                    <h3 className="font-playfair text-lg text-navy">Choose a Session</h3>
                  </div>

                  {sessionsLoading ? (
                    <LoadingSpinner />
                  ) : sessions.length === 0 ? (
                    <p className="font-cormorant italic text-text-mid text-center py-8">
                      No sessions available in the next 7 days. Check back soon.
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(sessionsByDate).map(([date, daySessions]) => (
                        <div key={date}>
                          <p className="font-sans text-xs uppercase tracking-[3px] text-text-soft mb-2 px-1">
                            {formatSessionDate(date)}
                          </p>
                          <div className="space-y-2">
                            {daySessions.map(s => (
                              <SessionCard
                                key={s.id}
                                session={s}
                                selected={selectedSession?.id === s.id}
                                onSelect={selectSession}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FadeUp>

              {/* Step 2 — Pick a seat */}
              {(step === 2 || step === 3) && selectedSession && (
                <FadeUp>
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center font-sans text-xs font-medium flex-shrink-0 bg-navy text-sky">2</span>
                      <h3 className="font-playfair text-lg text-navy">Choose Your Seat</h3>
                      <button onClick={backToSessions} className="ml-auto font-sans text-xs text-text-soft hover:text-navy underline transition-colors">
                        Change session
                      </button>
                    </div>
                    <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-5">
                      <SeatStep
                        session={selectedSession}
                        selectedSeat={selectedSeat}
                        onSelect={handleSelectSeat}
                      />
                    </div>
                  </div>
                </FadeUp>
              )}

              {/* Step 3 — Guest details */}
              {step === 3 && selectedSeat && (
                <FadeUp>
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center font-sans text-xs font-medium flex-shrink-0 bg-navy text-sky">3</span>
                      <h3 className="font-playfair text-lg text-navy">Your Details</h3>
                      <button onClick={backToSeats} className="ml-auto font-sans text-xs text-text-soft hover:text-navy underline transition-colors">
                        Change seat
                      </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-6 space-y-4">
                      {error && <Alert type="error">{error}</Alert>}

                      <div>
                        <label className="block font-sans text-sm font-medium text-text-mid mb-1.5">Full Name *</label>
                        <input
                          type="text"
                          value={guestName}
                          onChange={e => setGuestName(e.target.value)}
                          placeholder="Your name"
                          autoComplete="name"
                          className={inputCls}
                          style={{ fontSize: '16px' }}
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-sm font-medium text-text-mid mb-1.5">Phone Number *</label>
                        <input
                          type="tel"
                          value={guestPhone}
                          onChange={e => setGuestPhone(e.target.value)}
                          placeholder="(555) 555-5555"
                          autoComplete="tel"
                          className={inputCls}
                          style={{ fontSize: '16px' }}
                        />
                      </div>

                      <button
                        onClick={submitBooking}
                        disabled={loading || !guestName.trim() || !guestPhone.trim()}
                        className="w-full py-4 rounded-full font-sans font-medium text-base bg-navy text-sky hover:bg-navy-deep transition-all duration-200 disabled:opacity-50 mt-2"
                      >
                        {loading ? 'Confirming...' : 'Confirm Booking'}
                      </button>

                      <p className="font-sans text-xs text-text-soft text-center">
                        Walk-in fee collected at the door · No account needed
                      </p>
                    </div>
                  </div>
                </FadeUp>
              )}
            </>
          )}
        </div>
      </section>

    </div>
  )
}
