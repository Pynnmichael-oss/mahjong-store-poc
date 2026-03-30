import SessionCard from './SessionCard.jsx'
import EmptyState from '../ui/EmptyState.jsx'

export default function SessionList({ sessions, showReserveButton = false }) {
  if (!sessions.length) {
    return <EmptyState title="No sessions available" description="Check back soon for upcoming sessions." />
  }
  return (
    <div className="space-y-3">
      {sessions.map(s => (
        <SessionCard key={s.id} session={s} showReserveButton={showReserveButton} />
      ))}
    </div>
  )
}
