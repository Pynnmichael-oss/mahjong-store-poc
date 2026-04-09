import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'

function formatEventDate(event) {
  const dateStr = event.event_date || event.start_time
  const date = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatEventTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  if (isNaN(date)) return ''
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function EventCard({ event, userRsvp, onRsvp, onCancel, compact = false, isSpecial = false }) {
  const confirmedCount = (event.event_rsvps || []).filter(r => r.status === 'confirmed').length
  const isFull = confirmedCount >= event.capacity
  const isConfirmed = userRsvp?.status === 'confirmed'
  const isWaitlisted = userRsvp?.status === 'waitlisted'
  const eventTime = event.start_time ? formatEventTime(event.start_time) : ''

  return (
    <div className="bg-white rounded-2xl border border-navy/8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-250 overflow-hidden">
      {/* Accent bar */}
      <div className={`h-1 ${isSpecial ? 'bg-gold' : 'bg-navy'}`} />

      <div className="p-5">
        <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky-mid mb-2">
          {formatEventDate(event)}{eventTime ? ` · ${eventTime}` : ''}
        </p>
        <h3 className="font-playfair text-xl text-navy leading-tight mb-2">{event.title}</h3>

        {!compact && event.description && (
          <p className="font-cormorant text-text-mid text-base leading-relaxed mb-3 line-clamp-2">
            {event.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 mt-3">
          <div>
            <p className="font-playfair text-2xl text-navy">
              {event.cost ? `$${Number(event.cost).toFixed(0)}` : 'Free'}
              {event.cost ? <span className="font-sans text-sm text-text-soft font-normal ml-1">per person</span> : ''}
            </p>
            <p className="font-sans text-xs text-text-soft mt-1">
              {confirmedCount} / {event.capacity} going
            </p>
          </div>

          {!compact && (
            <div className="flex-shrink-0">
              {isConfirmed ? (
                <div className="text-right">
                  <span className="block font-sans text-sm font-medium text-sky-mid">You're going ✓</span>
                  <button
                    onClick={() => onCancel(userRsvp.id)}
                    className="font-sans text-xs text-text-soft hover:text-red-600 underline mt-1 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : isWaitlisted ? (
                <div className="text-right">
                  <span className="block font-sans text-sm font-medium text-text-soft">On waitlist</span>
                  <button
                    onClick={() => onCancel(userRsvp.id)}
                    className="font-sans text-xs text-text-soft hover:text-red-600 underline mt-1 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : isFull ? (
                <button
                  onClick={() => onRsvp(event)}
                  className="px-5 py-2 rounded-full font-sans text-sm font-medium bg-gold text-navy-deep hover:opacity-90 transition-all"
                >
                  Join Waitlist
                </button>
              ) : (
                <button
                  onClick={() => onRsvp(event)}
                  className="px-5 py-2 rounded-full font-sans text-sm font-medium bg-navy text-sky hover:bg-navy-deep transition-all"
                >
                  RSVP
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
