import { useEffect, useState } from 'react'
import storefrontImg from '../assets/storefront.jpg'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import FloatingTiles from '../components/layout/FloatingTiles.jsx'
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx'
import FadeUp from '../components/ui/FadeUp.jsx'
import { supabase } from '../services/supabase.js'
import { formatSessionDate, formatTime } from '../lib/dateUtils.js'

// ─── Public nav ───────────────────────────────────────────────────────────────

function PublicNav() {
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
          <a href="#schedule" className="font-sans text-sm text-sky/70 hover:text-sky transition-colors">Schedule</a>
          <a href="#location" className="font-sans text-sm text-sky/70 hover:text-sky transition-colors">Location</a>
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
            { href: '#about',    label: 'About'        },
            { href: '#how',      label: 'How It Works' },
            { href: '#schedule', label: 'Schedule'     },
            { href: '#location', label: 'Location'     },
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
            onClick={() => setMenuOpen(false)}
            className="block w-full text-center px-5 py-2.5 rounded-full font-sans text-sm font-medium bg-sky/10 text-sky border border-sky/20 hover:bg-sky/20 transition-all mt-2"
          >
            Sign In
          </Link>
        </div>
      )}
    </nav>
  )
}

// ─── Main AboutPage ───────────────────────────────────────────────────────────

export default function AboutPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [sessions, setSessions]           = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)

  // Redirect logged-in users
  useEffect(() => {
    if (!authLoading && user) {
      navigate(profile?.role === 'employee' ? '/employee' : '/dashboard', { replace: true })
    }
  }, [user, profile, authLoading, navigate])

  // Fetch upcoming sessions — next 7 days, public read
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const weekOut = new Date()
    weekOut.setDate(weekOut.getDate() + 7)
    const weekOutStr = weekOut.toISOString().split('T')[0]

    supabase
      .from('sessions')
      .select('*, seats(id, status)')
      .gte('date', today)
      .lte('date', weekOutStr)
      .eq('status', 'open')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .then(({ data }) => {
        setSessions(data || [])
        setSessionsLoading(false)
      })
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <LoadingSpinner color="sky" />
      </div>
    )
  }

  // Group sessions by date for the schedule display
  const sessionsByDate = sessions.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {})

  const today = new Date().toISOString().split('T')[0]

  return (
    <div id="top" className="min-h-screen bg-warm-white">
      <PublicNav />

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
            <Link
              to="/signup"
              className="px-8 py-4 rounded-full font-sans font-medium text-base bg-navy text-sky border-[1.5px] border-sky hover:bg-navy-deep hover:scale-105 transition-all duration-200 shadow-lg"
            >
              New? Get Started Here
            </Link>
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
            <Link
              to="/signup"
              className="inline-block font-sans font-medium text-navy text-sm border-b border-navy mt-8 pb-0.5 hover:text-sky-mid hover:border-sky-mid transition-colors"
            >
              Reserve your seat →
            </Link>
          </FadeUp>

          {/* Right — storefront photo */}
          <FadeUp delay={150}>
            <div className="relative rounded-2xl overflow-hidden min-h-[500px] shadow-lg">
              <img
                src={storefrontImg}
                alt="Four Winds Mahjong Club"
                className="w-full h-full object-cover absolute inset-0"
              />
              <div className="absolute inset-0 bg-navy/30" />
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
                title: 'Create Your Account',
                body: 'Sign up for free and choose a membership plan that fits how often you play.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ),
              },
              {
                num: '02',
                title: 'Pick Your Seat',
                body: 'Browse upcoming sessions and select your exact seat at one of our eight named tables.',
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

      {/* ── SECTION 4: THIS WEEK'S SCHEDULE ─────────────────────────────────── */}
      <section id="schedule" className="bg-warm-white py-20 px-4 sm:px-8">
        <div className="max-w-2xl mx-auto">
          <FadeUp>
            <div className="text-center mb-10">
              <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky-mid mb-3">Open Play</p>
              <h2 className="font-playfair text-navy text-4xl sm:text-5xl mb-3">This Week's Schedule</h2>
              <p className="font-cormorant italic text-text-mid text-xl">
                Reserve your seat by creating an account.
              </p>
            </div>
          </FadeUp>

          {sessionsLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : Object.keys(sessionsByDate).length === 0 ? (
            <FadeUp>
              <p className="font-cormorant italic text-text-soft text-center text-xl py-12">
                No sessions scheduled this week. Check back soon.
              </p>
            </FadeUp>
          ) : (
            <div className="space-y-4">
              {Object.entries(sessionsByDate).map(([date, daySessions], gi) => (
                <FadeUp key={date} delay={gi * 60}>
                  <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-6">
                    {/* Date header */}
                    <p className="font-playfair text-navy text-lg border-b border-navy/10 pb-2 mb-4">
                      {date === today ? 'Today' : formatSessionDate(date)}
                    </p>

                    <div className="space-y-3">
                      {daySessions.map(session => {
                        const available = session.seats
                          ? session.seats.filter(s => s.status === 'available').length
                          : (session.total_seats ?? 32)
                        const isFull = available <= 0

                        return (
                          <div
                            key={session.id}
                            className="flex items-center justify-between gap-4"
                          >
                            <p className="font-sans text-navy font-medium text-sm">
                              {formatTime(session.start_time)} – {formatTime(session.end_time)}
                            </p>
                            <span className={`font-sans text-xs px-3 py-1 rounded-full flex-shrink-0 ${
                              isFull
                                ? 'bg-red-400 text-white'
                                : 'bg-sky-light text-navy'
                            }`}>
                              {isFull ? 'Full' : `${available} seats left`}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          )}

          {/* Schedule CTA */}
          <FadeUp delay={100}>
            <div className="text-center mt-10">
              <p className="font-cormorant italic text-text-mid text-lg mb-5">
                Ready to reserve your seat?
              </p>
              <Link
                to="/signup"
                className="inline-block px-8 py-3 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all duration-200"
              >
                Create Your Account →
              </Link>
            </div>
          </FadeUp>
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

          {/* Right — storefront photo */}
          <FadeUp delay={150}>
            <div className="relative rounded-2xl overflow-hidden min-h-[400px] shadow-lg">
              <img
                src={storefrontImg}
                alt="Four Winds — Coming soon to Tulsa, Oklahoma"
                className="w-full h-full object-cover absolute inset-0"
              />
              <div className="absolute inset-0 bg-navy/20" />
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── SECTION 6: CTA (navy) ────────────────────────────────────────────── */}
      <section className="relative bg-navy py-28 px-4 sm:px-8 overflow-hidden">
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
              Join the club and reserve your seat at the table.
              Four Winds is your place to play.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="px-8 py-4 rounded-full font-sans font-medium text-base bg-sky text-navy hover:bg-sky/85 hover:scale-105 transition-all duration-200 shadow-lg"
              >
                New? Get Started Here
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 rounded-full font-sans font-medium text-base border-[1.5px] border-sky/50 text-sky hover:bg-sky/10 hover:border-sky transition-all duration-200"
              >
                Member Login
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
              { href: '#location', label: 'Location' },
              { to:   '/login',    label: 'Sign In'  },
            ].map(({ href, to, label }) =>
              to ? (
                <Link key={label} to={to} className="font-sans text-sm text-sky/40 hover:text-sky/70 transition-colors">
                  {label}
                </Link>
              ) : (
                <a key={label} href={href} className="font-sans text-sm text-sky/40 hover:text-sky/70 transition-colors">
                  {label}
                </a>
              )
            )}
          </div>

          {/* Right — social */}
          <div className="sm:text-right">
            <a
              href="https://www.instagram.com/fourwindstulsa/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-sm text-sky/40 hover:text-sky/70 transition-colors"
            >
              @fourwindstulsa
            </a>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-white/5 text-center">
          <p className="font-sans text-xs text-sky/20">
            © {new Date().getFullYear()} Four Winds Mahjong Club. Tulsa, Oklahoma.
          </p>
        </div>
      </footer>
    </div>
  )
}
