import { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import CustomerHeader from '../../components/layout/CustomerHeader.jsx'
import QRCodeDisplay from '../../components/checkin/QRCodeDisplay.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { MEMBERSHIP_TIERS, getMembershipBadgeClasses, getTableForSeat } from '../../lib/businessRules.js'
import { supabase } from '../../services/supabase.js'
import { formatSessionDate, formatTime, getLocalTodayString } from '../../lib/dateUtils.js'

export default function QRPage() {
  const { user, profile } = useAuth()
  const membershipType = profile?.membership_type ?? 'four_winds_member'
  const tier = MEMBERSHIP_TIERS[membershipType] ?? MEMBERSHIP_TIERS.four_winds_member
  const [nextReservation, setNextReservation] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    const today = getLocalTodayString()
    supabase
      .from('reservations')
      .select('*, sessions(date, start_time, end_time), seats(seat_number)')
      .eq('user_id', user.id)
      .eq('is_primary_seat', true)
      .in('status', ['confirmed', 'walk_in'])
      .then(({ data }) => {
        const upcoming = (data ?? [])
          .filter(r => (r.sessions?.date ?? '') >= today)
          .sort((a, b) => (a.sessions?.date ?? '').localeCompare(b.sessions?.date ?? ''))
        setNextReservation(upcoming[0] ?? null)
      })
  }, [user?.id])

  return (
    <PageWrapper noPad>
      <CustomerHeader />
      {/* Navy header */}
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto text-center">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Member Access</p>
          <h1 className="font-playfair text-3xl text-sky">Your Check-In Code</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 sm:px-6 py-12 flex flex-col items-center gap-6">
        <QRCodeDisplay value={user?.id ?? ''} size={260} />

        <p className="font-cormorant italic text-text-mid text-lg text-center leading-relaxed">
          Show this code to staff when you arrive for your session.
        </p>

        <div className="text-center">
          <p className="font-playfair text-xl text-navy">{profile?.full_name ?? '—'}</p>
          <span className={`inline-flex items-center gap-1.5 mt-2 px-4 py-1.5 rounded-full font-sans text-xs font-medium ${getMembershipBadgeClasses(membershipType)}`}>
            {membershipType === 'founding_member' && (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z"/>
              </svg>
            )}
            {tier.name}
          </span>
        </div>

        {nextReservation ? (
          <div className="w-full bg-white rounded-2xl border border-navy/8 shadow-sm px-6 py-5 text-center space-y-1">
            <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky-mid mb-3">Your Next Session</p>
            <p className="font-playfair text-navy text-xl">
              {formatSessionDate(nextReservation.sessions?.date)}
            </p>
            <p className="font-cormorant italic text-text-mid text-base">
              {formatTime(nextReservation.sessions?.start_time)}
            </p>
            {nextReservation.seats && (() => {
              const { tableName } = getTableForSeat(nextReservation.seats.seat_number)
              return (
                <p className="font-playfair text-navy text-base">
                  {tableName} · Seat {nextReservation.seats.seat_number}
                </p>
              )
            })()}
            <p className="font-cormorant italic text-text-soft text-sm pt-2">Show this screen when you arrive</p>
          </div>
        ) : (
          <EmptyState
            message="No upcoming reservations"
            description="Book a session to see your details here."
          />
        )}
      </div>
    </PageWrapper>
  )
}
