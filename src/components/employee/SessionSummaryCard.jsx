import { Link } from 'react-router-dom'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'

export default function SessionSummaryCard({ session, reservations = [] }) {
  const reserved  = reservations.filter(r => r.status === 'confirmed').length
  const checkedIn = reservations.filter(r => r.status === 'checked_in' || r.status === 'walk_in').length
  const noShow    = reservations.filter(r => r.status === 'no_show').length

  const today = new Date().toISOString().split('T')[0]
  const isToday = session.date === today

  return (
    <div className={`bg-white rounded-2xl border border-navy/8 shadow-sm p-5 ${isToday ? 'border-l-4 border-l-gold' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-sans text-[11px] uppercase tracking-[3px] text-sky-mid mb-0.5">
            {isToday ? 'Today' : formatSessionDate(session.date)}
          </p>
          <p className="font-playfair text-lg text-navy">
            {formatTime(session.start_time)} – {formatTime(session.end_time)}
          </p>
        </div>
        <Link
          to={`/employee/sessions/${session.id}`}
          className="flex-shrink-0 px-4 py-2 rounded-full font-sans text-sm font-medium text-navy border border-navy/20 hover:bg-sky-pale transition-all"
        >
          Manage →
        </Link>
      </div>
      <div className="flex gap-6 font-sans text-sm">
        <div>
          <span className="block font-medium text-navy text-lg">{reserved}</span>
          <span className="text-text-soft text-xs">Reserved</span>
        </div>
        <div>
          <span className="block font-medium text-sky-mid text-lg">{checkedIn}</span>
          <span className="text-text-soft text-xs">Checked In</span>
        </div>
        <div>
          <span className="block font-medium text-red-500 text-lg">{noShow}</span>
          <span className="text-text-soft text-xs">No Show</span>
        </div>
      </div>
    </div>
  )
}
