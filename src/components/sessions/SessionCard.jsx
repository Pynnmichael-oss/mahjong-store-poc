import { Link } from 'react-router-dom'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'

export default function SessionCard({ session, showReserveButton = false }) {
  const available = session.seats?.filter(s => s.status === 'available').length ?? '—'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
      <div>
        <div className="font-semibold text-gray-900">{formatSessionDate(session.date)}</div>
        <div className="text-sm text-gray-500">
          {formatTime(session.start_time)} – {formatTime(session.end_time)}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge status={session.status} />
          <span className="text-xs text-gray-400">{available} seats left</span>
        </div>
      </div>
      {showReserveButton && (
        <Link to={`/sessions/${session.id}/reserve`}>
          <Button variant="primary" className="whitespace-nowrap">Reserve</Button>
        </Link>
      )}
    </div>
  )
}
