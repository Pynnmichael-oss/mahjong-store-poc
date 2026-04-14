import { Link } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useUserReservations } from '../../hooks/useReservations.js'
import { useWeeklyLimit } from '../../hooks/useWeeklyLimit.js'
import { useEvents } from '../../hooks/useEvents.js'
import FadeUp from '../../components/ui/FadeUp.jsx'
import ReservationSummary from '../../components/reservations/ReservationSummary.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import { MEMBERSHIP_TIERS } from '../../lib/businessRules.js'

const QUICK_LINKS = [
  { to: '/sessions', label: 'Sessions',   sub: 'Book a seat'      },
  { to: '/events',   label: 'Events',     sub: 'See what\'s on'   },
  { to: '/my-qr',   label: 'My QR Code', sub: 'Check in at door' },
  { to: '/history',  label: 'History',    sub: 'Past sessions'    },
]

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { reservations, loading: resLoading } = useUserReservations(user?.id)
  const { checkedInCount } = useWeeklyLimit(reservations, profile?.membership_type)
  const { events } = useEvents()

  const today = new Date().toISOString().split('T')[0]
  const upcoming = reservations.filter(r =>
    ['confirmed'].includes(r.status) && (r.sessions?.date ?? '') >= today
  )
  const nextReservation = upcoming[0]
  const upcomingEvents = events.slice(0, 2)

  const membershipType = profile?.membership_type ?? 'walk_in'
  const tier = MEMBERSHIP_TIERS[membershipType] ?? MEMBERSHIP_TIERS.walk_in

  const memberSinceDate = profile?.created_at ? new Date(profile.created_at) : null
  const memberSinceMonth = memberSinceDate
    ? memberSinceDate.toLocaleDateString('en-US', { month: 'short' })
    : '—'
  const memberSinceYear = memberSinceDate
    ? memberSinceDate.getFullYear()
    : ''

  const membershipLabel = membershipType === 'subscriber' ? 'Subscriber' : 'Walk-in'
  const membershipSub   = membershipType === 'subscriber' ? '3 plays/week included' : 'Pay per session'

  return (
    <PageWrapper noPad>
      {/* Hero strip — greeting left, stats right */}
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

          {/* Right — 3 stat pills */}
          <FadeUp>
            <div className="flex gap-4 flex-wrap">
              {/* Plays this week */}
              <div className="bg-white/8 border border-sky/20 rounded-2xl px-5 py-4 text-center min-w-[110px]">
                <p className="font-playfair text-sky text-3xl font-bold">
                  {membershipType === 'unlimited' ? '∞' : checkedInCount}
                  {membershipType === 'subscriber' && (
                    <span className="text-sky/40 text-lg">/3</span>
                  )}
                </p>
                <p className="text-sky/50 text-xs tracking-wider uppercase font-sans mt-1">Plays this week</p>
              </div>

              {/* Upcoming reservations */}
              <div className="bg-white/8 border border-sky/20 rounded-2xl px-5 py-4 text-center min-w-[110px]">
                <p className="font-playfair text-sky text-3xl font-bold">{upcoming.length}</p>
                <p className="text-sky/50 text-xs tracking-wider uppercase font-sans mt-1">Upcoming</p>
              </div>

              {/* Member since */}
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Next reservation */}
        {!resLoading && nextReservation && (
          <FadeUp delay={100}>
            <h2 className="font-playfair text-xl text-navy mb-4">
              Your Next <em className="text-sky-mid">Session</em>
            </h2>
            <div className="border-l-4 border-gold pl-1">
              <ReservationSummary reservation={nextReservation} />
            </div>
          </FadeUp>
        )}

        {/* Quick links */}
        <FadeUp delay={150}>
          <h2 className="font-playfair text-xl text-navy mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {QUICK_LINKS.map(({ to, label, sub }) => (
              <Link key={to} to={to}>
                <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-5 text-center hover:shadow-md hover:-translate-y-1 transition-all duration-250">
                  <p className="font-playfair text-navy text-base">{label}</p>
                  <p className="font-sans text-xs text-text-soft mt-1">{sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </FadeUp>

        {/* Upcoming events preview */}
        {upcomingEvents.length > 0 && (
          <FadeUp delay={200}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-playfair text-xl text-navy">
                Upcoming <em className="text-sky-mid">Events</em>
              </h2>
              <Link to="/events" className="font-sans text-sm text-sky-mid hover:text-navy transition-colors">
                See all →
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingEvents.map(e => (
                <div key={e.id} className="bg-white rounded-2xl border border-navy/8 shadow-sm p-5">
                  <p className="font-playfair text-navy text-lg">{e.title}</p>
                  <p className="font-cormorant italic text-text-mid text-base mt-1 line-clamp-1">{e.description}</p>
                </div>
              ))}
            </div>
          </FadeUp>
        )}
      </div>
    </PageWrapper>
  )
}
