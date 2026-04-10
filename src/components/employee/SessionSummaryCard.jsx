import { useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../ui/Badge.jsx'
import Modal from '../ui/Modal.jsx'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'
import { cancelSession } from '../../services/sessionService.js'

export default function SessionSummaryCard({ session, reservations = [], onCancelled }) {
  const confirmed   = reservations.filter(r => r.status === 'confirmed').length
  const checkedIn   = reservations.filter(r => r.status === 'checked_in' || r.status === 'walk_in').length
  const noShow      = reservations.filter(r => r.status === 'no_show').length
  const totalBooked = confirmed + checkedIn + noShow
  const capacity    = session.total_seats ?? 32
  const fillPct     = Math.round((totalBooked / capacity) * 100)

  const today       = new Date().toISOString().split('T')[0]
  const isToday     = session.date === today
  const isCancelled = session.status === 'cancelled'

  const [showConfirm, setShowConfirm] = useState(false)
  const [cancelling, setCancelling]   = useState(false)

  async function handleCancel() {
    setCancelling(true)
    try {
      await cancelSession(session.id)
      setShowConfirm(false)
      onCancelled?.()
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <div className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
        isCancelled
          ? 'border-navy/5 opacity-60'
          : isToday
          ? 'border-l-4 border-l-gold border-navy/8'
          : 'border-navy/8 hover:shadow-md hover:-translate-y-0.5 duration-200'
      }`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[3px] text-sky-mid mb-0.5">
              {isToday ? 'Today' : formatSessionDate(session.date)}
            </p>
            <p className={`font-playfair text-lg text-navy ${isCancelled ? 'line-through text-text-soft' : ''}`}>
              {formatTime(session.start_time)} – {formatTime(session.end_time)}
            </p>
          </div>
          <Badge status={session.status} />
        </div>

        {/* Stats row */}
        <div className="flex gap-5 font-sans text-sm mb-4">
          <div>
            <span className="block font-medium text-navy text-base">{totalBooked} / {capacity}</span>
            <span className="text-text-soft text-xs">Reserved</span>
          </div>
          <div>
            <span className="block font-medium text-sky-mid text-base">{checkedIn}</span>
            <span className="text-text-soft text-xs">Checked In</span>
          </div>
          <div>
            <span className="block font-medium text-red-500 text-base">{noShow}</span>
            <span className="text-text-soft text-xs">No Show</span>
          </div>
        </div>

        {/* Fill rate bar */}
        {!isCancelled && (
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="font-sans text-xs text-text-soft">Fill rate</span>
              <span className="font-sans text-xs font-medium text-navy">{fillPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-cream overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  fillPct >= 75 ? 'bg-sky-mid' : fillPct >= 50 ? 'bg-gold' : 'bg-red-400'
                }`}
                style={{ width: `${fillPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isCancelled && (
          <div className="flex gap-2 flex-wrap">
            <Link
              to={`/employee/sessions/${session.id}`}
              className="flex-1 text-center px-4 py-2 rounded-full font-sans text-sm font-medium bg-navy text-sky hover:bg-navy-deep transition-all"
            >
              Manage →
            </Link>
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 rounded-full font-sans text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-all"
            >
              Cancel Session
            </button>
          </div>
        )}
      </div>

      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Cancel Session">
        <p className="font-cormorant italic text-text-mid text-lg mb-2">
          {formatSessionDate(session.date)} · {formatTime(session.start_time)} – {formatTime(session.end_time)}
        </p>
        <p className="font-sans text-sm text-text-mid mb-6">
          Cancel this session? Members with reservations will need to be notified manually.
          Reservations are kept on record.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 py-3 rounded-full font-sans text-sm font-medium border border-navy/20 text-navy hover:bg-sky-pale transition-all"
          >
            Keep Session
          </button>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex-1 py-3 rounded-full font-sans text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50"
          >
            {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
          </button>
        </div>
      </Modal>
    </>
  )
}
