import Badge from '../ui/Badge.jsx'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'

export default function ReservationSummary({ reservation }) {
  const session = reservation.sessions
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-gray-900">
            {session ? formatSessionDate(session.date) : '—'}
          </div>
          <div className="text-sm text-gray-500">
            {session ? `${formatTime(session.start_time)} – ${formatTime(session.end_time)}` : ''}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Seat #{reservation.seats?.seat_number ?? '—'}
          </div>
        </div>
        <Badge status={reservation.status} />
      </div>
      {reservation.is_flagged_overage && (
        <div className="mt-2 text-xs text-orange-600 font-medium">⚠ Weekly limit exceeded</div>
      )}
    </div>
  )
}
