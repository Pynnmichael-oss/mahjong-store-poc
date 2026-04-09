export default function EventRSVPButton({ event, userRsvp, onRsvp, onCancel }) {
  const confirmedCount = (event.event_rsvps || []).filter(r => r.status === 'confirmed').length
  const isFull = confirmedCount >= event.capacity
  const isConfirmed = userRsvp?.status === 'confirmed'
  const isWaitlisted = userRsvp?.status === 'waitlisted'

  if (isConfirmed) return (
    <div className="flex items-center gap-2">
      <span className="font-sans text-sm font-medium text-sky-mid">You're going ✓</span>
      <button onClick={() => onCancel(userRsvp.id)} className="font-sans text-xs text-text-soft hover:text-red-600 underline transition-colors">Cancel</button>
    </div>
  )
  if (isWaitlisted) return (
    <div className="flex items-center gap-2">
      <span className="font-sans text-sm text-text-soft">On waitlist</span>
      <button onClick={() => onCancel(userRsvp.id)} className="font-sans text-xs text-text-soft hover:text-red-600 underline transition-colors">Cancel</button>
    </div>
  )
  if (isFull) return (
    <button onClick={() => onRsvp(event)} className="px-5 py-2 rounded-full font-sans text-sm font-medium bg-gold text-navy-deep hover:opacity-90 transition-all">
      Join Waitlist
    </button>
  )
  return (
    <button onClick={() => onRsvp(event)} className="px-5 py-2 rounded-full font-sans text-sm font-medium bg-navy text-sky hover:bg-navy-deep transition-all">
      RSVP
    </button>
  )
}
