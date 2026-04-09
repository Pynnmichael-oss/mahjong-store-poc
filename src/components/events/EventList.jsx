import EventCard from './EventCard.jsx'
import EmptyState from '../ui/EmptyState.jsx'

export default function EventList({ events, userRsvps = [], onRsvp, onCancel }) {
  if (!events.length) {
    return <EmptyState message="No upcoming events yet. Stay tuned." />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {events.map(event => {
        const userRsvp = userRsvps.find(r => r.event_id === event.id && r.status !== 'cancelled') ?? null
        return (
          <EventCard
            key={event.id}
            event={event}
            userRsvp={userRsvp}
            onRsvp={onRsvp}
            onCancel={onCancel}
          />
        )
      })}
    </div>
  )
}
