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
import { checkBuddyPassCode, redeemBuddyPass } from '../services/buddyPassService.js'
import { getTableForSeat } from '../lib/businessRules.js'

// ─── Public nav ───────────────────────────────────────────────────────────────

function PublicNav({ onBookClick }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 60) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-navy/95 backdrop-blur-md shadow-lg border-b border-white/5'
        : 'bg-navy/70 backdrop-blur-sm'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#top" className="font-playfair text-sky text-xl tracking-wide">
          Four Winds
        </a>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-6">
          <a href="#about"    className="font-sans text-sm text-sky/70 hover:text-sky transition-colors">About</a>
          <a href="#how"      className="font-sans text-sm text-sky/70 hover:text-sky transition-colors">How It Works</a>
          <a href="#location" className="font-sans text-sm text-sky/70 hover:text-sky transition-colors">Location</a>
          <a href="#book"     onClick={onBookClick} className="font-sans text-sm text-sky/70 hover:text-sky transition-colors">Book</a>
          <Link
            to="/login"
            className="ml-2 px-5 py-2 rounded-full font-sans text-sm font-medium bg-sky/10 text-sky border border-sky/20 hover:bg-sky/20 transition-all"
          >
            Sign In
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="sm:hidden p-2 text-sky/70 hover:text-sky transition-colors"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden bg-navy border-t border-white/5 px-4 py-4 space-y-3">
          {[
            { href: '#about',    label: 'About'       },
            { href: '#how',      label: 'How It Works' },
            { href: '#location', label: 'Location'    },
            { href: '#book',     label: 'Book'        },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="block font-sans text-sm text-sky/70 hover:text-sky py-2 transition-colors"
            >
              {label}
            </a>
          ))}
          <Link
            to="/login"
            className="block w-full text-center px-5 py-2.5 rounded-full font-sans text-sm font-medium bg-sky/10 text-sky border border-sky/20 hover:bg-sky/20 transition-all mt-2"
          >
            Sign In
          </Link>
        </div>
      )}
    </nav>
  )
}

// ─── Session card (public booking flow) ──────────────────────────────────────

function SessionCard({ session, selected, onSelect }) {
  const today = new Date().toISOString().split('T')[0]
  const isToday = session.date === today
  const available = session.seats
    ? session.seats.filter(s => s.status === 'available').length
    : (session.total_seats ?? 32) - (session.reserved_count ?? 0)
  const isFull = available <= 0

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
            isFull ? 'bg-red-100 text-red-700' : available <= 4 ? 'bg-gold-light text-navy' : 'bg-sky-light text-navy'
          }`}>
            {isFull ? 'Full' : `${available} left`}
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

function SeatStep({ session, selectedSeat, onSelect }) {
  const { seats, loading } = useSeats(session?.id)
  if (loading) return <LoadingSpinner />
  return <SeatMap seats={seats} selectedSeat={selectedSeat} onSelect={onSelect} />
}

function ConfirmationCard({ confirmation, onReset, isBuddyPass = false }) {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl border-t-4 border-gold shadow-xl p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-gold-light flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-playfair text-3xl text-navy mb-1">You're booked!</h2>
        {isBuddyPass && (
          <span className="inline-flex items-center px-3 py-1 rounded-full font-sans text-xs font-medium bg-gold text-navy mb-3">
            Buddy Pass
          </span>
        )}
        <p className="font-cormorant italic text-text-mid text-lg mb-6">Show this screen when you arrive</p>
        <div className="bg-cream rounded-xl p-5 text-left space-y-3 mb-6">
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">Date &amp; Time</p>
            <p className="font-playfair text-navy text-lg mt-0.5">{confirmation.sessionDate}</p>
            <p className="font-sans text-sm text-text-mid">{confirmation.sessionTime}</p>
          </div>
          <div className="border-t border-navy/8 pt-3">
            <p className="font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">Your Seat</p>
            <p className="font-playfair text-navy text-lg mt-0.5">{confirmation.tableName} · Seat {confirmation.seatNumber}</p>
          </div>
          <div className="border-t border-navy/8 pt-3">
            <p className="font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">Name</p>
            <p className="font-playfair text-navy text-lg mt-0.5">{confirmation.guestName}</p>
          </div>
        </div>
        <p className="font-sans text-xs text-text-soft mb-6">Walk-in fee collected at the door</p>
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

// ─── Main AboutPage ───────────────────────────────────────────────────────────

export default function AboutPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const bookingRef = useRef(null)

  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)

  const {
    step, selectedSession, selectedSeat,
    guestName, setGuestName, guestPhone, setGuestPhone,
    loading: bookingLoading, error: bookingError, confirmation,
    selectSession, selectSeat, backToSessions, backToSeats,
    submitBooking, reset,
  } = useGuestBooking()

  // Payment step state
  const [paymentType, setPaymentType]     = useState('walk_in')    // 'walk_in' | 'buddy_pass'
  const [paymentStage, setPaymentStage]   = useState('select')     // 'select' | 'details'
  const [buddyCode, setBuddyCode]         = useState('')
  const [codeStatus, setCodeStatus]       = useState(null)          // null | 'checking' | 'valid' | 'invalid'
  const [codeValidation, setCodeValidation] = useState(null)
  const [codeError, setCodeError]         = useState(null)
  const [buddyConfirmation, setBuddyConfirmation] = useState(null)
  const [redeeming, setRedeeming]         = useState(false)
  const [redeemError, setRedeemError]     = useState(null)

  function resetPaymentState() {
    setPaymentType('walk_in')
    setPaymentStage('select')
    setBuddyCode('')
    setCodeStatus(null)
    setCodeValidation(null)
    setCodeError(null)
    setRedeemError(null)
  }

  function handleBackToSeats() {
    backToSeats()
    resetPaymentState()
  }

  async function handleBuddyValidate() {
    if (!buddyCode.trim()) return
    setCodeStatus('checking')
    setCodeError(null)
    setCodeValidation(null)
    try {
      const result = await checkBuddyPassCode(buddyCode.trim())
      setCodeValidation(result)
      setCodeStatus('valid')
    } catch (err) {
      setCodeError(err.message)
      setCodeStatus('invalid')
    }
  }

  async function handleBuddyRedeem() {
    if (!guestName.trim() || !guestPhone.trim()) return
    setRedeeming(true)
    setRedeemError(null)
    try {
      await redeemBuddyPass(
        buddyCode,
        selectedSession.id,
        selectedSeat.id,
        guestName.trim(),
        guestPhone.trim()
      )
      const tableInfo   = getTableForSeat(selectedSeat.seat_number)
      const sessionDate = formatSessionDate(selectedSession.date)
      const sessionTime = `${formatTime(selectedSession.start_time)} – ${formatTime(selectedSession.end_time)}`
      setBuddyConfirmation({
        sessionDate,
        sessionTime,
        tableName:  tableInfo.tableName,
        seatNumber: selectedSeat.seat_number,
        guestName:  guestName.trim(),
      })
      // Send SMS same as walk-in flow
      try {
        await supabase.functions.invoke('send-sms', {
          body: {
            phone:       guestPhone.trim(),
            guestName:   guestName.trim(),
            sessionDate,
            sessionTime,
            tableName:   tableInfo.tableName,
            seatNumber:  selectedSeat.seat_number,
          },
        })
      } catch (_) { /* non-critical */ }
    } catch (err) {
      setRedeemError(err.message)
    } finally {
      setRedeeming(false)
    }
  }

  function handleFullReset() {
    reset()
    setBuddyConfirmation(null)
    resetPaymentState()
  }

  // Redirect logged-in users
  useEffect(() => {
    if (!authLoading && user) {
      navigate(profile?.role === 'employee' ? '/employee' : '/dashboard', { replace: true })
    }
  }, [user, profile, authLoading, navigate])

  // Fetch upcoming sessions (public)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const weekOut = new Date(); weekOut.setDate(weekOut.getDate() + 14)
    const weekOutStr = weekOut.toISOString().split('T')[0]
    supabase
      .from('sessions')
      .select('*, seats(id, status)')
      .gte('date', today)
      .lte('date', weekOutStr)
      .eq('status', 'open')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .then(({ data }) => { setSessions(data || []); setSessionsLoading(false) })
  }, [])

  function scrollToBooking(e) {
    e?.preventDefault()
    bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleSelectSeat(seat) {
    selectSeat(seat)
    setTimeout(() => bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <LoadingSpinner color="sky" />
      </div>
    )
  }

  const sessionsByDate = sessions.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {})

  const inputCls = 'w-full bg-white border border-navy/20 rounded-full px-5 py-3 font-sans text-base text-navy placeholder:text-text-soft focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy/40 transition-all'

  return (
    <div id="top" className="min-h-screen bg-warm-white">
      <PublicNav onBookClick={scrollToBooking} />

      {/* ── SECTION 1: HERO ─────────────────────────────────────────────────── */}
      <section className="relative bg-navy min-h-screen flex flex-col items-center justify-center px-4 py-24 overflow-hidden">
        <FloatingTiles />

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          {/* Eyebrow with side lines */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex-1 max-w-[80px] h-px bg-sky-mid/30" />
            <p className="font-sans text-sky-mid text-xs tracking-[5px] uppercase whitespace-nowrap">
              Mahjong Club &amp; Event Space
            </p>
            <div className="flex-1 max-w-[80px] h-px bg-sky-mid/30" />
          </div>

          {/* Main heading */}
          <h1
            className="font-playfair text-sky leading-[0.9] tracking-[-2px] mb-6"
            style={{ fontSize: 'clamp(72px, 12vw, 120px)' }}
          >
            Four<br />
            <em className="text-sky/40">Winds</em>
          </h1>

          {/* Wave accent */}
          <p className="text-sky-mid/40 text-2xl tracking-[10px] mb-8 select-none" aria-hidden="true">
            ~ ~ ~
          </p>

          {/* Subheading */}
          <p className="font-cormorant italic text-sky/70 text-xl sm:text-2xl max-w-md mx-auto leading-relaxed mb-12">
            A gathering place for the art of mahjong.<br />
            Reserve your table. Join the club.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={scrollToBooking}
              className="px-8 py-4 rounded-full font-sans font-medium text-base bg-sky text-navy hover:bg-sky/85 hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Book a Walk-In Session
            </button>
            <Link
              to="/login"
              className="px-8 py-4 rounded-full font-sans font-medium text-base border-[1.5px] border-sky/50 text-sky hover:bg-sky/10 hover:border-sky transition-all duration-200"
            >
              Member Login
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-50">
          <p className="font-sans text-sky-mid/60 text-[10px] uppercase tracking-[4px]">Scroll</p>
          <div className="w-px h-8 bg-sky-mid/40" />
        </div>
      </section>

      {/* ── SECTION 2: ABOUT ────────────────────────────────────────────────── */}
      <section id="about" className="bg-warm-white py-24 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — text */}
          <FadeUp>
            <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky-mid mb-4">The Space</p>
            <h2 className="font-playfair text-navy text-4xl sm:text-5xl leading-tight mb-8">
              A club worth{' '}
              <em className="text-sky-mid">belonging to</em>
            </h2>
            <div className="space-y-5 font-cormorant text-text-mid text-xl leading-[1.7]">
              <p>
                Four Winds is Tulsa's first dedicated mahjong club and event space.
                Whether you're a seasoned player or picking up tiles for the first time,
                there's a seat at the table for you.
              </p>
              <p>
                Eight beautifully appointed tables. A welcoming community. And everything
                you need to play — tiles, equipment, and great company.
              </p>
            </div>
            <button
              onClick={scrollToBooking}
              className="inline-block font-sans font-medium text-navy text-sm border-b border-navy mt-8 pb-0.5 hover:text-sky-mid hover:border-sky-mid transition-colors"
            >
              Reserve your seat →
            </button>
          </FadeUp>

          {/* Right — graphic placeholder */}
          <FadeUp delay={150}>
            <div className="bg-navy rounded-2xl min-h-[420px] flex flex-col items-center justify-center p-10">
              {/* Simple table layout SVG */}
              <svg viewBox="0 0 200 160" className="w-48 h-36 mb-6" fill="none">
                {/* 4 tables in 2x2 grid */}
                {[
                  { cx: 50, cy: 50 }, { cx: 150, cy: 50 },
                  { cx: 50, cy: 115 }, { cx: 150, cy: 115 },
                ].map(({ cx, cy }, i) => (
                  <g key={i}>
                    {/* Table surface */}
                    <rect x={cx - 22} y={cy - 15} width={44} height={30} rx={5} fill="#c9a84c" fillOpacity={0.2} stroke="#c9a84c" strokeOpacity={0.5} strokeWidth={1} />
                    {/* Seats around table */}
                    {[
                      [cx, cy - 28],        // top
                      [cx, cy + 28],        // bottom
                      [cx - 35, cy],        // left
                      [cx + 35, cy],        // right
                    ].map(([sx, sy], j) => (
                      <circle key={j} cx={sx} cy={sy} r={6} fill="#b8d4f5" fillOpacity={0.4} stroke="#b8d4f5" strokeOpacity={0.6} strokeWidth={1} />
                    ))}
                  </g>
                ))}
              </svg>
              <p className="font-cormorant italic text-sky/40 text-sm text-center">
                [ Photo of the space coming soon ]
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── SECTION 3: HOW IT WORKS ─────────────────────────────────────────── */}
      <section id="how" className="bg-cream py-24 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <div className="text-center mb-16">
              <h2 className="font-playfair text-navy text-4xl sm:text-5xl mb-3">How it works</h2>
              <p className="font-cormorant italic text-text-mid text-xl">Three simple steps to your seat.</p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'Choose a Session',
                body: 'Browse upcoming open play sessions and pick a time that works for you.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                num: '02',
                title: 'Pick Your Seat',
                body: 'Select your exact seat at one of our eight named tables. Your spot is held for you.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                ),
              },
              {
                num: '03',
                title: 'Show Up and Play',
                body: 'Check in with your QR code when you arrive. Tiles and equipment are provided. Just play.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ].map(({ num, title, body, icon }, i) => (
              <FadeUp key={num} delay={i * 100}>
                <div className="relative bg-white rounded-2xl border border-navy/8 shadow-sm p-8 text-center hover:shadow-md hover:-translate-y-1 transition-all duration-250 overflow-hidden h-full">
                  {/* Background number */}
                  <span
                    className="absolute top-3 left-4 font-playfair text-7xl text-navy/6 select-none pointer-events-none leading-none"
                    aria-hidden="true"
                  >
                    {num}
                  </span>

                  <div className="relative z-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-light text-sky-mid mb-5">
                      {icon}
                    </div>
                    <h3 className="font-playfair text-navy text-xl mb-3">{title}</h3>
                    <p className="font-cormorant text-text-mid text-lg leading-relaxed">{body}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: WALK-IN BOOKING ──────────────────────────────────────── */}
      <section id="book" ref={bookingRef} className="bg-warm-white py-20 px-4 sm:px-8">
        <div className="max-w-3xl mx-auto">

          {(step === 'confirmed' || buddyConfirmation) ? (
            <FadeUp>
              <ConfirmationCard
                confirmation={buddyConfirmation ?? confirmation}
                onReset={handleFullReset}
                isBuddyPass={!!buddyConfirmation}
              />
            </FadeUp>
          ) : (
            <>
              <FadeUp>
                <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky-mid mb-2 text-center">
                  Walk-in Booking
                </p>
                <h2 className="font-playfair text-3xl sm:text-4xl text-navy text-center mb-12">
                  Book Your <em className="text-sky-mid">Seat</em>
                </h2>
              </FadeUp>

              {/* Step 1 — session */}
              <FadeUp delay={50}>
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center font-sans text-xs font-medium flex-shrink-0 ${step >= 1 ? 'bg-navy text-sky' : 'bg-navy/10 text-text-soft'}`}>
                      1
                    </span>
                    <h3 className="font-playfair text-lg text-navy">Choose a Session</h3>
                  </div>

                  {sessionsLoading ? (
                    <LoadingSpinner />
                  ) : sessions.length === 0 ? (
                    <p className="font-cormorant italic text-text-mid text-center py-8">
                      No sessions available in the next two weeks. Check back soon.
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

              {/* Step 2 — seat */}
              {(step === 2 || step === 3) && selectedSession && (
                <FadeUp>
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center font-sans text-xs font-medium flex-shrink-0 bg-navy text-sky">
                        2
                      </span>
                      <h3 className="font-playfair text-lg text-navy">Choose Your Seat</h3>
                      <button
                        onClick={backToSessions}
                        className="ml-auto font-sans text-xs text-text-soft hover:text-navy underline transition-colors"
                      >
                        Change session
                      </button>
                    </div>
                    <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-5">
                      <SeatStep session={selectedSession} selectedSeat={selectedSeat} onSelect={handleSelectSeat} />
                    </div>
                  </div>
                </FadeUp>
              )}

              {/* Step 3 — payment type */}
              {step === 3 && selectedSeat && paymentStage === 'select' && (
                <FadeUp>
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center font-sans text-xs font-medium flex-shrink-0 bg-navy text-sky">3</span>
                      <h3 className="font-playfair text-lg text-navy">How would you like to book?</h3>
                      <button onClick={handleBackToSeats} className="ml-auto font-sans text-xs text-text-soft hover:text-navy underline transition-colors">
                        Change seat
                      </button>
                    </div>

                    <div className="space-y-3 mb-5">
                      {/* Walk-in card */}
                      <button
                        onClick={() => setPaymentType('walk_in')}
                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                          paymentType === 'walk_in' ? 'border-navy bg-sky-pale' : 'border-navy/10 bg-white hover:border-navy/30'
                        }`}
                      >
                        <p className="font-playfair text-navy text-lg mb-1">Walk-In Session</p>
                        <p className="font-sans text-sm text-text-mid">Pay the walk-in fee when you arrive.</p>
                      </button>

                      {/* Buddy pass card */}
                      <div className={`p-5 rounded-2xl border-2 transition-all ${
                        paymentType === 'buddy_pass' ? 'border-gold bg-gold-light/20' : 'border-navy/10 bg-white'
                      }`}>
                        <button
                          onClick={() => setPaymentType('buddy_pass')}
                          className="w-full text-left"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-playfair text-navy text-lg">Buddy Pass</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-sans text-xs font-medium bg-gold-light text-navy border border-gold/30">
                              Free with member code
                            </span>
                          </div>
                          <p className="font-sans text-sm text-text-mid">
                            Have a code from a Four Winds member? Enter it here.
                          </p>
                        </button>

                        {/* Code input — only visible when buddy pass is selected */}
                        {paymentType === 'buddy_pass' && (
                          <div className="mt-4">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={buddyCode}
                                onChange={e => {
                                  setBuddyCode(e.target.value.toUpperCase())
                                  setCodeStatus(null)
                                  setCodeValidation(null)
                                  setCodeError(null)
                                }}
                                placeholder="e.g. FW-AB12CD34"
                                className="flex-1 border border-navy/20 rounded-full px-4 py-2.5 font-sans text-sm text-navy uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-sky-mid"
                                style={{ fontSize: '16px' }}
                              />
                              <button
                                onClick={handleBuddyValidate}
                                disabled={!buddyCode.trim() || codeStatus === 'checking'}
                                className="px-4 py-2.5 rounded-full font-sans text-sm font-medium bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50 whitespace-nowrap"
                              >
                                {codeStatus === 'checking' ? '...' : 'Validate'}
                              </button>
                            </div>

                            {codeStatus === 'valid' && codeValidation && (
                              <div className="mt-2 flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <p className="font-sans text-xs text-green-700">
                                  Code accepted! {codeValidation.remaining} pass{codeValidation.remaining !== 1 ? 'es' : ''} remaining for {codeValidation.ownerName}'s account.
                                </p>
                              </div>
                            )}
                            {codeStatus === 'invalid' && codeError && (
                              <p className="mt-2 font-sans text-xs text-red-600">{codeError}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setPaymentStage('details')}
                      disabled={paymentType === 'buddy_pass' && codeStatus !== 'valid'}
                      className="w-full py-3 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50"
                    >
                      Continue →
                    </button>
                  </div>
                </FadeUp>
              )}

              {/* Step 4 — details */}
              {step === 3 && selectedSeat && paymentStage === 'details' && (
                <FadeUp>
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center font-sans text-xs font-medium flex-shrink-0 bg-navy text-sky">4</span>
                      <h3 className="font-playfair text-lg text-navy">Your Details</h3>
                      <button
                        onClick={() => setPaymentStage('select')}
                        className="ml-auto font-sans text-xs text-text-soft hover:text-navy underline transition-colors"
                      >
                        Change payment
                      </button>
                    </div>
                    <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-6 space-y-4">
                      {(bookingError || redeemError) && (
                        <Alert type="error">{bookingError ?? redeemError}</Alert>
                      )}
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
                        onClick={paymentType === 'buddy_pass' ? handleBuddyRedeem : submitBooking}
                        disabled={
                          (paymentType === 'buddy_pass' ? redeeming : bookingLoading) ||
                          !guestName.trim() || !guestPhone.trim()
                        }
                        className="w-full py-4 rounded-full font-sans font-medium text-base bg-navy text-sky hover:bg-navy-deep transition-all duration-200 disabled:opacity-50 mt-2"
                      >
                        {(paymentType === 'buddy_pass' ? redeeming : bookingLoading)
                          ? 'Confirming...'
                          : 'Confirm Booking'}
                      </button>
                      <p className="font-sans text-xs text-text-soft text-center">
                        {paymentType === 'buddy_pass'
                          ? 'Buddy pass · No payment needed'
                          : 'Walk-in fee collected at the door · No account needed'}
                      </p>
                    </div>
                  </div>
                </FadeUp>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── SECTION 5: LOCATION ─────────────────────────────────────────────── */}
      <section id="location" className="bg-cream py-24 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — text */}
          <FadeUp>
            <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky-mid mb-4">Find Us</p>
            <h2 className="font-playfair text-navy text-4xl sm:text-5xl leading-tight mb-8">
              Coming soon to<br />
              <em className="text-sky-mid">Tulsa, Oklahoma</em>
            </h2>
            <div className="font-cormorant text-text-mid text-xl leading-[1.7] mb-8">
              <p>
                Four Winds will be opening its doors in Tulsa, Oklahoma.
                Follow us on Instagram for updates on our opening date and location.
              </p>
            </div>

            {/* Instagram link */}
            <a
              href="https://www.instagram.com/fourwindstulsa/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-sans text-sm font-medium text-sky-mid hover:text-navy transition-colors mb-8 group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              @fourwindstulsa
              <svg className="w-3 h-3 opacity-50 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            {/* Address placeholder */}
            <div className="border border-dashed border-navy/20 rounded-xl p-4">
              <p className="font-cormorant italic text-text-soft text-sm">[ Address coming soon ]</p>
            </div>
          </FadeUp>

          {/* Right — map placeholder */}
          <FadeUp delay={150}>
            <div className="bg-navy rounded-2xl min-h-[320px] flex flex-col items-center justify-center p-10">
              {/* Location pin */}
              <svg className="w-16 h-16 text-sky-mid mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="font-playfair text-sky/60 text-lg mb-1">Tulsa, Oklahoma</p>
              <p className="font-cormorant italic text-sky/40 text-sm">[ Map coming soon ]</p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── SECTION 6: CTA (navy) ────────────────────────────────────────────── */}
      <section className="relative bg-navy py-28 px-4 sm:px-8 overflow-hidden">
        {/* Watermark text */}
        <span
          className="absolute inset-0 flex items-center justify-center font-playfair text-navy-deep select-none pointer-events-none whitespace-nowrap overflow-hidden"
          style={{ fontSize: 'clamp(80px, 18vw, 200px)', opacity: 0.15 }}
          aria-hidden="true"
        >
          four winds
        </span>

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <FadeUp>
            <p className="font-sans text-[11px] uppercase tracking-[5px] text-sky-mid mb-4">Ready to play?</p>
            <h2 className="font-playfair text-sky text-5xl sm:text-6xl leading-tight mb-6">
              Your table is waiting.
            </h2>
            <p className="font-cormorant italic text-sky/60 text-xl sm:text-2xl max-w-lg mx-auto mb-10 leading-relaxed">
              Join the club, book a walk-in seat, or bring your whole group.
              Four Winds is your place to play.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={scrollToBooking}
                className="px-8 py-4 rounded-full font-sans font-medium text-base bg-sky text-navy hover:bg-sky/85 hover:scale-105 transition-all duration-200 shadow-lg"
              >
                Book a Walk-In Session
              </button>
              <Link
                to="/signup"
                className="px-8 py-4 rounded-full font-sans font-medium text-base border-[1.5px] border-sky/50 text-sky hover:bg-sky/10 hover:border-sky transition-all duration-200"
              >
                Create an Account
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="bg-navy-deep px-4 sm:px-8 py-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 items-start">
          {/* Left — brand */}
          <div>
            <p className="font-playfair text-sky text-xl mb-1">Four Winds</p>
            <p className="font-cormorant italic text-sky/50 text-sm">Mahjong Club &amp; Event Space</p>
          </div>

          {/* Center — nav links */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-center">
            {[
              { href: '#about',    label: 'About'    },
              { href: '#how',      label: 'Sessions' },
              { href: '#location', label: 'Events'   },
              { to:   '/login',    label: 'Sign In'  },
            ].map(({ href, to, label }) =>
              to ? (
                <Link key={label} to={to} className="font-sans text-sky-mid text-sm opacity-60 hover:opacity-100 transition-opacity">
                  {label}
                </Link>
              ) : (
                <a key={label} href={href} className="font-sans text-sky-mid text-sm opacity-60 hover:opacity-100 transition-opacity">
                  {label}
                </a>
              )
            )}
          </div>

          {/* Right — copyright */}
          <div className="sm:text-right">
            <p className="font-sans text-sky/30 text-xs">© 2026 Four Winds · Tulsa, Oklahoma</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
