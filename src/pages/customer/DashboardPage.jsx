import { Link } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import CustomerHeader from '../../components/layout/CustomerHeader.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useUserReservations } from '../../hooks/useReservations.js'
import FadeUp from '../../components/ui/FadeUp.jsx'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'
import { getTableForSeat } from '../../lib/businessRules.js'


export default function DashboardPage() {
  const { user } = useAuth()
  const { reservations, loading: resLoading } = useUserReservations(user?.id)

  const today = new Date().toISOString().split('T')[0]
  const upcoming = reservations.filter(r =>
    r.status === 'confirmed' && (r.sessions?.date ?? '') >= today
  )
  const nextReservation = upcoming[0]

  const nextSession = nextReservation?.sessions
  const nextSeat    = nextReservation?.seats
  const tableInfo   = nextSeat ? getTableForSeat(nextSeat.seat_number) : null

  return (
    <PageWrapper noPad>
      <CustomerHeader />

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

    </PageWrapper>
  )
}
