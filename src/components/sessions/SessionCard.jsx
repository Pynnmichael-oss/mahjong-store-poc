import { Link } from 'react-router-dom'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'

export default function SessionCard({ session, showReserveButton = false }) {
  const today = new Date().toISOString().split('T')[0]
  const isToday = session.date === today

  const totalSeats = session.total_seats ?? 40
  const reservedCount = session.reserved_count ?? 0
  const remaining = totalSeats - reservedCount
  const isFull = remaining <= 0
  const isAlmostFull = remaining > 0 && remaining <= 6

  return (
    <div className={`bg-white rounded-2xl border border-navy/8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-250 overflow-hidden ${isToday ? 'border-l-4 border-l-gold' : ''}`}>
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
              ? 'bg-red-100 text-red-700'
              : isAlmostFull
              ? 'bg-gold-light text-navy'
              : 'bg-sky-light text-navy'
          }`}>
            {isFull ? 'Fully booked' : `${remaining} of ${totalSeats} seats open`}
          </span>
        </div>

        {showReserveButton && !isFull && (
          <Link
            to={`/sessions/${session.id}/reserve`}
            className="flex-shrink-0 font-sans text-sm font-medium text-navy hover:text-sky-mid transition-colors"
          >
            Reserve a Seat →
          </Link>
        )}
      </div>
    </div>
  )
}
