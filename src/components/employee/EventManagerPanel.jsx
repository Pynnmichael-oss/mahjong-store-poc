import { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Badge from '../ui/Badge.jsx'
import { fetchEventRsvps, updateEventStatus } from '../../services/eventService.js'
import LoadingSpinner from '../ui/LoadingSpinner.jsx'

function formatEventDate(event) {
  const dateStr = event.event_date || event.start_time
  const date = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function EventManagerPanel({ event, onUpdate }) {
  const [showRsvps, setShowRsvps] = useState(false)
  const [rsvps, setRsvps] = useState([])
  const [loadingRsvps, setLoadingRsvps] = useState(false)

  const confirmedCount = (event.event_rsvps || []).filter(r => r.status === 'confirmed').length
  const isPast = event.status !== 'upcoming'

  async function handleViewRsvps() {
    setShowRsvps(true)
    setLoadingRsvps(true)
    try {
      const data = await fetchEventRsvps(event.id)
      setRsvps(data)
    } finally {
      setLoadingRsvps(false)
    }
  }

  async function handleCancel() {
    if (!confirm(`Cancel "${event.title}"?`)) return
    await updateEventStatus(event.id, 'cancelled')
    onUpdate()
  }

  return (
    <>
      <div className={`bg-white rounded-2xl border border-navy/8 shadow-sm p-5 overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
        <div className="h-0.5 bg-navy -mx-5 -mt-5 mb-5" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-sans text-[11px] uppercase tracking-[3px] text-sky-mid mb-1">{formatEventDate(event)}</p>
            <h3 className="font-playfair text-lg text-navy">{event.title}</h3>
            <div className="flex items-center gap-3 mt-2">
              <Badge status={event.status} />
              <span className="font-sans text-xs text-text-soft">{confirmedCount} / {event.capacity} RSVPs</span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleViewRsvps}
              className="px-4 py-2 rounded-full font-sans text-sm font-medium border border-navy/20 text-navy hover:bg-sky-pale transition-all"
            >
              View RSVPs
            </button>
            {event.status === 'upcoming' && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-full font-sans text-sm font-medium border-[1.5px] border-red-300 text-red-600 hover:bg-red-50 transition-all"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <Modal open={showRsvps} onClose={() => setShowRsvps(false)} title={`RSVPs — ${event.title}`}>
        {loadingRsvps ? (
          <LoadingSpinner />
        ) : rsvps.length === 0 ? (
          <p className="font-cormorant italic text-text-mid text-base text-center py-6">No RSVPs yet.</p>
        ) : (
          <div className="divide-y divide-navy/5">
            {rsvps.map(r => (
              <div key={r.id} className="flex items-center justify-between py-3">
                <span className="font-sans font-medium text-navy text-sm">{r.profiles?.full_name ?? '—'}</span>
                <Badge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  )
}
