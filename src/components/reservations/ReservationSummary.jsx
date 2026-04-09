import Badge from '../ui/Badge.jsx'
import { getTableForSeat } from '../../lib/businessRules.js'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'

export default function ReservationSummary({ reservation }) {
  const session = reservation.sessions
  const seat = reservation.seats
  const tableInfo = seat ? getTableForSeat(seat.seat_number) : null

  return (
    <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-playfair text-lg text-navy leading-tight">
            {session ? formatSessionDate(session.date) : '—'}
          </p>
          <p className="font-sans text-sm text-text-mid mt-1">
            {session ? `${formatTime(session.start_time)} – ${formatTime(session.end_time)}` : ''}
          </p>
          {seat && (
            <p className="font-sans text-sm text-text-soft mt-1">
              {tableInfo?.tableName} Table · Seat {seat.seat_number}
            </p>
          )}
          {reservation.is_flagged_overage && (
            <p className="font-sans text-xs text-gold mt-1.5 font-medium">Fee due at door</p>
          )}
        </div>
        <Badge status={reservation.status} />
      </div>
    </div>
  )
}
