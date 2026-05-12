import { Link } from 'react-router-dom'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'

export default function SessionCard({ session, showReserveButton = false, isBooked = false }) {
  const today = new Date().toISOString().split('T')[0]
  const isToday = session.date === today

  const totalSeats = session.total_seats ?? 32
  const remaining = session.availableSeats ?? (totalSeats - (session.reserved_count ?? 0))
  const isFull = remaining <= 0
  const isAlmostFull = remaining > 0 && remaining <= 6

  return (
    <div className={`bg-white rounded-2xl border border-navy/8 shadow-sm overflow-hidden transition-all duration-250 ${isToday ? 'border-l-4 border-l-gold' : ''} ${isFull ? 'opacity-75' : 'hover:shadow-md hover:-translate-y-1'}`}>
      <div className="p-5 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-sans text-[11px] uppercase tracking-[3px] text-sky-mid mb-1">
            {isToday ? 'Today' : formatSessionDate(session.date).split(',')[0]}
          </p>
          <h3 className="font-playfair text-xl text-navy leading-tight">
            {formatSessionDate(session.date).split(',').slice(1).join(',').trim() || formatSessionDate(session.date)}
          </h3>
          <p className="font-sans text-sm text-text-mid mt-1">
            {formatTime(session.start_time)} – {formatTime(session.end_time)}
          </p>
          <span className={`inline-flex items-center mt-2 px-3 py-1 rounded-full font-sans text-xs font-medium ${
            isFull
              ? 'bg-gold-light border border-gold text-navy'
              : isAlmostFull
              ? 'bg-gold-light text-navy'
              : 'bg-sky-light text-navy'
          }`}>
            {isFull ? 'Full' : `${remaining} of ${totalSeats} seats open`}
          </span>
        </div>

        {showReserveButton && (
          isBooked ? (
            <span className="flex-shrink-0 inline-flex items-center px-3 py-1.5 rounded-full font-sans text-xs font-medium bg-sky-light text-sky-mid border border-sky-mid/30">
              Already booked ✓
            </span>
          ) : isFull ? (
            <button disabled className="flex-shrink-0 bg-navy/20 text-navy/40 font-sans text-sm rounded-full py-2.5 px-4 cursor-not-allowed">
              Session Full
            </button>
          ) : (
            <Link to={`/sessions/${session.id}/reserve`} className="flex-shrink-0 font-sans text-sm font-medium text-navy hover:text-sky-mid transition-colors">
              Reserve a Seat →
            </Link>
          )
        )}
      </div>
    </div>
  )
}
