import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'

export default function AttendeeRow({ reservation, onNoShow, onOverride, disabled }) {
  const profile = reservation.profiles
  const seat = reservation.seats

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 px-4 text-sm text-gray-900">{profile?.full_name ?? '—'}</td>
      <td className="py-3 px-4 text-sm text-gray-500">#{seat?.seat_number ?? '—'}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Badge status={reservation.status} />
          {reservation.is_flagged_overage && (
            <span className="text-xs text-orange-500 font-medium" title="Weekly overage">⚠</span>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex justify-end gap-2">
          {reservation.status === 'confirmed' && (
            <Button variant="danger" className="text-xs py-1 px-2" onClick={() => onNoShow(reservation.id)} disabled={disabled}>
              No Show
            </Button>
          )}
          {reservation.status === 'no_show' && (
            <Button variant="ghost" className="text-xs py-1 px-2" onClick={() => onOverride(reservation.id)} disabled={disabled}>
              Override
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}
