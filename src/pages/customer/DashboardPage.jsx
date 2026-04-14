import { Link } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useUserReservations } from '../../hooks/useReservations.js'
import { useWeeklyLimit } from '../../hooks/useWeeklyLimit.js'
import FadeUp from '../../components/ui/FadeUp.jsx'
import { MEMBERSHIP_TIERS } from '../../lib/businessRules.js'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'
import { getTableForSeat } from '../../lib/businessRules.js'

const QUICK_LINKS = [
  { to: '/events',  label: 'Events',     icon: '🎭' },
  { to: '/my-qr',  label: 'My QR Code', icon: '📱' },
  { to: '/history', label: 'History',    icon: '📋' },
  { to: '/reserve', label: 'Profile',    icon: '👤' },
]

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { reservations, loading: resLoading } = useUserReservations(user?.id)
  const { checkedInCount } = useWeeklyLimit(reservations, profile?.membership_type)

  const today = new Date().toISOString().split('T')[0]
  const upcoming = reservations.filter(r =>
    r.status === 'confirmed' && (r.sessions?.date ?? '') >= today
  )
  const nextReservation = upcoming[0]

  const membershipType = profile?.membership_type ?? 'walk_in'

  const memberSinceDate = profile?.created_at ? new Date(profile.created_at) : null
  const memberSinceMonth = memberSinceDate
    ? memberSinceDate.toLocaleDateString('en-US', { month: 'short' })
    : '—'
  const memberSinceYear = memberSinceDate ? memberSinceDate.getFullYear() : ''

  const membershipLabel = membershipType === 'subscriber' ? 'Subscriber'
    : membershipType === 'unlimited' ? 'Dragon Pass'
    : 'Walk-in'
  const membershipSub = membershipType === 'subscriber' ? '3 plays/week included'
    : membershipType === 'unlimited' ? 'Unlimited plays'
    : 'Pay per session'

  // Next session card data
  const nextSession = nextReservation?.sessions
  const nextSeat    = nextReservation?.seats
  const tableInfo   = nextSeat ? getTableForSeat(nextSeat.seat_number) : null

  return (
    <PageWrapper noPad>
      {/* ── Hero strip ── */}
      <div className="bg-navy px-4 sm:px-8 py-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-6">
          {/* Left — greeting */}
          <FadeUp>
            <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky-mid mb-1">Welcome back</p>
            <h1 className="font-playfair text-sky text-4xl font-bold">
              {profile?.full_name?.split(' ')[0] ?? 'Member'}
            </h1>
            <p className="font-cormorant italic text-sky/60 text-lg mt-1">
              {membershipLabel} — {membershipSub}
            </p>
          </FadeUp>

          {/* Right — stat pills */}
          <FadeUp>
            <div className="flex gap-4 flex-wrap">
              <div className="bg-white/8 border border-sky/20 rounded-2xl px-5 py-4 text-center min-w-[110px]">
                <p className="font-playfair text-sky text-3xl font-bold">
                  {membershipType === 'unlimited' ? '∞' : checkedInCount}
                  {membershipType === 'subscriber' && (
                    <span className="text-sky/40 text-lg">/3</span>
                  )}
                </p>
                <p className="text-sky/50 text-xs tracking-wider uppercase font-sans mt-1">Plays this week</p>
              </div>

              <div className="bg-white/8 border border-sky/20 rounded-2xl px-5 py-4 text-center min-w-[110px]">
                <p className="font-playfair text-sky text-3xl font-bold">{upcoming.length}</p>
                <p className="text-sky/50 text-xs tracking-wider uppercase font-sans mt-1">Upcoming</p>
              </div>

              <div className="bg-white/8 border border-sky/20 rounded-2xl px-5 py-4 text-center min-w-[110px]">
                <p className="font-playfair text-sky text-xl font-bold leading-tight">
                  {memberSinceMonth}<br />
                  <span className="text-2xl">{memberSinceYear}</span>
                </p>
                <p className="text-sky/50 text-xs tracking-wider uppercase font-sans mt-1">Member since</p>
              </div>
            </div>
          </FadeUp>
        </div>
      </div>

      {/* ── Primary CTA section ── */}
      <div className="bg-cream py-10 px-4 sm:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <FadeUp>
            {/* Next reservation card — shown above CTA if exists */}
            {!resLoading && nextReservation && nextSession && (
              <div className="mb-8 text-left border-l-4 border-gold bg-white rounded-2xl px-6 py-5 shadow-sm">
                <p className="font-sans text-[10px] uppercase tracking-[3px] text-sky-mid mb-2">Your next session</p>
                <p className="font-playfair text-navy text-xl">
                  {formatSessionDate(nextSession.date)}
                </p>
                <p className="font-playfair text-navy text-lg">
                  {formatTime(nextSession.start_time)} – {formatTime(nextSession.end_time)}
                </p>
                {tableInfo && nextSeat && (
                  <p className="font-sans text-sm text-text-mid mt-1">
                    {tableInfo.tableName} · Seat {nextSeat.seat_number}
                  </p>
                )}
                <Link
                  to="/history"
                  className="inline-block font-sans text-xs text-sky-mid hover:text-navy transition-colors mt-3"
                >
                  View all reservations →
                </Link>
              </div>
            )}

            <h2 className="font-playfair text-navy text-2xl mb-2">Ready to play?</h2>
            <p className="font-cormorant italic text-text-mid text-lg mb-6">
              Reserve your seat at the table.
            </p>

            <Link to="/sessions">
              <button className="w-full sm:w-auto sm:min-w-[280px] bg-navy text-sky rounded-full py-4 px-10 font-sans font-medium text-lg hover:bg-navy-deep hover:scale-105 transition-all duration-200 inline-flex items-center justify-center gap-3">
                Book a Session
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </Link>
          </FadeUp>
        </div>
      </div>

      {/* ── Quick links ── */}
      <div className="bg-warm-white py-8 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <p className="font-sans text-xs uppercase tracking-widest text-text-soft mb-4">Quick Links</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {QUICK_LINKS.map(({ to, label, icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-2 bg-white border border-navy/8 rounded-xl px-4 py-3 font-sans text-sm text-text-mid hover:shadow-sm hover:text-navy transition-all duration-150"
                >
                  <span className="text-base">{icon}</span>
                  {label}
                </Link>
              ))}
            </div>
          </FadeUp>
        </div>
      </div>
    </PageWrapper>
  )
}
