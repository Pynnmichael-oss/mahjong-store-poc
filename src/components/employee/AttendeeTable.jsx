import AttendeeRow from './AttendeeRow.jsx'
import EmptyState from '../ui/EmptyState.jsx'

export default function AttendeeTable({ reservations, onNoShow, onOverride, disabled }) {
  if (!reservations.length) {
    return <EmptyState title="No reservations yet" />
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full bg-white rounded-xl border border-gray-200">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="py-3 px-4">Name</th>
            <th className="py-3 px-4">Seat</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map(r => (
            <AttendeeRow
              key={r.id}
              reservation={r}
              onNoShow={onNoShow}
              onOverride={onOverride}
              disabled={disabled}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
