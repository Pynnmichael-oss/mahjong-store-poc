import AttendeeRow from './AttendeeRow.jsx'
import EmptyState from '../ui/EmptyState.jsx'

export default function AttendeeTable({ reservations, onNoShow, onOverride, onPayCheckin, onCheckin, monthlyCountsMap = {}, disabled }) {
  if (!reservations.length) {
    return <EmptyState message="No reservations for this session yet." />
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-navy/8 shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="bg-cream border-b border-navy/8">
            <th className="py-3 px-4 text-left font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">Name</th>
            <th className="py-3 px-4 text-left font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">Table · Seat</th>
            <th className="py-3 px-4 text-left font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">Status</th>
            <th className="py-3 px-4 text-right font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((r, i) => (
            <AttendeeRow
              key={r.id}
              reservation={r}
              index={i}
              onNoShow={onNoShow}
              onOverride={onOverride}
              onPayCheckin={onPayCheckin}
              onCheckin={onCheckin}
              monthlyCount={monthlyCountsMap[r.user_id] ?? null}
              disabled={disabled}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
