import { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import QRCodeDisplay from '../../components/checkin/QRCodeDisplay.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { MEMBERSHIP_TIERS, getTableForSeat } from '../../lib/businessRules.js'
import { supabase } from '../../services/supabase.js'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'

export default function QRPage() {
  const { user, profile } = useAuth()
  const membershipType = profile?.membership_type ?? 'walk_in'
  const tier = MEMBERSHIP_TIERS[membershipType] ?? MEMBERSHIP_TIERS.walk_in
  const [nextReservation, setNextReservation] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('reservations')
      .select('*, sessions(date, start_time, end_time), seats(seat_number)')
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'reserved'])
      .then(({ data }) => {
        const upcoming = (data ?? [])
          .filter(r => r.sessions?.date >= today)
          .sort((a, b) => {
            const da = (a.sessions?.date ?? '') + 'T' + (a.sessions?.start_time ?? '')
            const db = (b.sessions?.date ?? '') + 'T' + (b.sessions?.start_time ?? '')
            return da.localeCompare(db)
          })
        setNextReservation(upcoming[0] ?? null)
      })
  }, [user?.id])

  return (
    <PageWrapper noPad>
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
          <span className={`inline-flex items-center mt-2 px-4 py-1.5 rounded-full font-sans text-xs font-medium ${
            membershipType === 'subscriber' ? 'bg-navy text-sky' : 'bg-cream text-navy border border-navy/20'
          }`}>
            {tier.name}
          </span>
        </div>

        {nextReservation ? (
          <div className="w-full bg-cream rounded-2xl border border-navy/10 px-6 py-5 text-center space-y-1">
            <p className="font-sans text-[10px] uppercase tracking-[3px] text-sky-mid mb-3">Your Next Session</p>
            <p className="font-playfair text-navy text-xl">
              {formatSessionDate(nextReservation.sessions?.date)}
            </p>
            <p className="font-sans text-sm text-text-mid">
              {formatTime(nextReservation.sessions?.start_time)}
            </p>
            {nextReservation.seats && (() => {
              const { tableName } = getTableForSeat(nextReservation.seats.seat_number)
              return (
                <p className="font-sans text-sm text-text-mid">
                  {tableName} · Seat {nextReservation.seats.seat_number}
                </p>
              )
            })()}
            <p className="font-cormorant italic text-text-soft text-sm pt-2">Show this screen when you arrive</p>
          </div>
        ) : (
          <p className="font-cormorant italic text-text-soft text-base text-center">
            No upcoming reservations. Book a session to see your details here.
          </p>
        )}
      </div>
    </PageWrapper>
  )
}
