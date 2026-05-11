import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useUserReservations } from '../../hooks/useReservations.js'
import { useWeeklyLimit } from '../../hooks/useWeeklyLimit.js'
import { useWeeklySessionCount } from '../../hooks/useMonthlySessionCount.js'
import { getMembershipLabel, getMembershipDescription, getWeeklyLimit } from '../../lib/businessRules.js'
import FadeUp from '../ui/FadeUp.jsx'

export default function CustomerHeader() {
  const { user, profile, loading } = useAuth()
  const { reservations } = useUserReservations(user?.id)
  const { checkedInCount } = useWeeklyLimit(reservations, profile?.membership_type)
  const { weeklyCount } = useWeeklySessionCount()

  const today = new Date().toISOString().split('T')[0]
  const upcoming = reservations.filter(r =>
    r.status === 'confirmed' && (r.sessions?.date ?? '') >= today
  )

  const membershipType = profile?.membership_type ?? 'four_winds_member'
  const isFlowerPass = membershipType === 'flower_pass'
  const isBambooPass = membershipType === 'bamboo_pass'
  const isDragonPass = membershipType === 'dragon_pass'
  const hasWeekly    = isFlowerPass || isBambooPass
  const weeklyLimit  = getWeeklyLimit(membershipType)

  const memberSinceDate  = profile?.created_at ? new Date(profile.created_at) : null
  const memberSinceMonth = memberSinceDate
    ? memberSinceDate.toLocaleDateString('en-US', { month: 'short' })
    : '—'
  const memberSinceYear = memberSinceDate ? memberSinceDate.getFullYear() : ''

  return (
    <div className="bg-navy px-4 sm:px-8 py-10">
      <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-6">
        <FadeUp>
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky-mid mb-1">Welcome back</p>
          <h1 className="font-playfair text-sky text-4xl font-bold">
            {loading || !profile
              ? <span className="inline-block w-32 h-9 bg-sky/20 rounded-lg animate-pulse" />
              : profile.full_name?.split(' ')[0] ?? 'Member'}
          </h1>
          <p className="font-cormorant italic text-sky/60 text-lg mt-1">
            {loading || !profile
              ? <span className="inline-block w-48 h-5 bg-sky/20 rounded-lg animate-pulse" />
              : `${getMembershipLabel(membershipType)} — ${getMembershipDescription(membershipType)}`}
          </p>
        </FadeUp>

        <FadeUp>
          <div className="flex gap-4 flex-wrap">
            <div className="bg-white/8 border border-sky/20 rounded-2xl px-5 py-4 text-center w-[110px] h-[90px] flex flex-col items-center justify-center">
              <p className="font-playfair text-sky text-3xl font-bold">
                {isDragonPass ? '∞' : hasWeekly ? weeklyCount : checkedInCount}
                {hasWeekly && weeklyLimit && <span className="text-sky/40 text-lg">/{weeklyLimit}</span>}
              </p>
              <p className="text-sky/50 text-xs tracking-wider uppercase font-sans mt-1">
                {hasWeekly ? 'Sessions this week' : 'Plays this week'}
              </p>
            </div>

            <div className="bg-white/8 border border-sky/20 rounded-2xl px-5 py-4 text-center w-[110px] h-[90px] flex flex-col items-center justify-center">
              <p className="font-playfair text-sky text-3xl font-bold">{upcoming.length}</p>
              <p className="text-sky/50 text-xs tracking-wider uppercase font-sans mt-1">Upcoming</p>
            </div>

            <div className="bg-white/8 border border-sky/20 rounded-2xl px-5 py-4 text-center w-[110px] h-[90px] flex flex-col items-center justify-center">
              <p className="font-playfair text-sky text-xl font-bold leading-tight">
                {memberSinceMonth}<br />
                <span className="text-2xl">{memberSinceYear}</span>
              </p>
              <p className="text-sky/50 text-xs tracking-wider uppercase font-sans mt-1">Member since</p>
            </div>

            <Link to="/my-qr">
              <div className="bg-white/8 border border-sky/20 rounded-2xl px-5 py-4 text-center w-[110px] h-[90px] flex flex-col items-center justify-center hover:bg-white/15 transition-all cursor-pointer">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-sky mx-auto mb-1" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="8" height="8" rx="1"/>
                  <rect x="13" y="3" width="8" height="8" rx="1"/>
                  <rect x="3" y="13" width="8" height="8" rx="1"/>
                  <rect x="5" y="5" width="4" height="4" fill="currentColor" stroke="none"/>
                  <rect x="15" y="5" width="4" height="4" fill="currentColor" stroke="none"/>
                  <rect x="5" y="15" width="4" height="4" fill="currentColor" stroke="none"/>
                  <rect x="13" y="13" width="2" height="2" fill="currentColor" stroke="none"/>
                  <rect x="17" y="13" width="2" height="2" fill="currentColor" stroke="none"/>
                  <rect x="13" y="17" width="2" height="2" fill="currentColor" stroke="none"/>
                  <rect x="17" y="17" width="2" height="2" fill="currentColor" stroke="none"/>
                  <rect x="15" y="15" width="2" height="2" fill="currentColor" stroke="none"/>
                </svg>
                <p className="text-sky/50 text-xs tracking-wider uppercase font-sans mt-1">My QR Code</p>
              </div>
            </Link>
          </div>
        </FadeUp>
      </div>
    </div>
  )
}
