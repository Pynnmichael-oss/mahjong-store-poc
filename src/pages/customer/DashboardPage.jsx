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

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'

  return (
    <PageWrapper noPad>
      {/* Hero strip */}
      <div className="bg-navy px-4 sm:px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Welcome back</p>
            <h1 className="font-playfair text-3xl sm:text-4xl text-sky leading-tight">
              {profile?.full_name?.split(' ')[0] ?? 'Member'}
            </h1>
            <p className="font-cormorant italic text-sky/70 text-lg mt-2">
              {tier.tagline}
            </p>
            <span className={`inline-flex items-center mt-3 px-4 py-1.5 rounded-full font-sans text-xs font-medium ${
              membershipType === 'subscriber' ? 'bg-sky/10 text-sky border border-sky/20' : 'bg-white/5 text-sky/70 border border-sky/10'
            }`}>
              {tier.name}
            </span>
          </FadeUp>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Stats row */}
        <FadeUp>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: membershipType === 'subscriber' ? `${checkedInCount} / 3` : '∞', label: 'Plays this week' },
              { value: upcoming.length,  label: 'Upcoming reservations' },
              { value: memberSince,      label: 'Member since', small: true },
            ].map(({ value, label, small }) => (
              <div key={label} className="bg-white rounded-2xl border border-navy/8 shadow-sm p-5 text-center">
                <p className={`font-playfair text-navy leading-tight ${small ? 'text-base' : 'text-3xl'}`}>
                  {value}
                </p>
                <p className="font-sans text-xs text-text-soft mt-1">{label}</p>
              </div>
            ))}
          </div>
        </FadeUp>

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
