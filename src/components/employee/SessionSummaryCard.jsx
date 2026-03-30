import { Link } from 'react-router-dom'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'
import Button from '../ui/Button.jsx'

export default function SessionSummaryCard({ session, reservations = [] }) {
  const reserved = reservations.filter(r => r.status === 'confirmed').length
  const checkedIn = reservations.filter(r => r.status === 'checked_in' || r.status === 'walk_in').length
  const noShow = reservations.filter(r => r.status === 'no_show').length

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-semibold text-gray-900">{formatSessionDate(session.date)}</div>
          <div className="text-sm text-gray-500">{formatTime(session.start_time)} – {formatTime(session.end_time)}</div>
        </div>
        <Link to={`/employee/sessions/${session.id}`}>
          <Button variant="secondary" className="text-xs">Manage</Button>
        </Link>
      </div>
      <div className="flex gap-4 text-sm">
        <span className="text-blue-600 font-medium">{reserved} reserved</span>
        <span className="text-green-600 font-medium">{checkedIn} checked in</span>
        <span className="text-red-500 font-medium">{noShow} no show</span>
      </div>
    </div>
  )
}
