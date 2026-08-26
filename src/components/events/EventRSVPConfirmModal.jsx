import Modal from '../ui/Modal.jsx'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'

export default function EventRSVPConfirmModal({ event, open, onConfirm, onCancel, submitting }) {
  if (!event) return null

  const costFormatted = `$${Number(event.cost).toFixed(2)}`

  return (
    <Modal open={open} onClose={onCancel} title="Confirm RSVP">
      <div className="space-y-5">
        <div className="bg-cream rounded-xl p-4 space-y-1">
          <p className="font-playfair text-navy text-lg">{event.title}</p>
          <p className="font-sans text-sm text-text-mid">
            {formatSessionDate(event.event_date)}
            {event.start_time && <> · {formatTime(event.start_time)}</>}
          </p>
        </div>

        <div className="bg-gold-light border border-gold/30 rounded-xl px-4 py-3">
          <p className="font-cormorant italic text-navy text-base">
            Reservation Confirmed, Payment of {costFormatted} will be charged at arrival.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-5 py-2 rounded-full font-sans text-sm text-text-mid hover:text-navy transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="px-5 py-2 rounded-full font-sans text-sm font-medium bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50"
          >
            {submitting ? 'Confirming…' : 'Confirm RSVP'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
