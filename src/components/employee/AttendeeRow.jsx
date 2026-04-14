import Badge from '../ui/Badge.jsx'
import { getTableForSeat } from '../../lib/businessRules.js'

export default function AttendeeRow({ reservation, onNoShow, onOverride, disabled, index }) {
  const profile  = reservation.profiles
  const seat     = reservation.seats
  const tableInfo = seat ? getTableForSeat(seat.seat_number) : null
  const isAlt    = index % 2 === 1
  const isGuest      = reservation.is_guest === true
  const isBuddyPass  = reservation.is_buddy_pass === true
  const name         = isGuest ? reservation.guest_name : profile?.full_name

  return (
    <tr className={`border-b border-navy/5 last:border-0 ${isAlt ? 'bg-sky-pale' : 'bg-white'}`}>
      {/* Name */}
      <td className="py-4 px-4 min-h-[56px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-sans font-medium text-navy text-sm">{name ?? '—'}</span>
          {isBuddyPass ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-sans text-xs font-medium bg-gold text-navy">
              Buddy Pass
            </span>
          ) : isGuest && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-sans text-xs font-medium bg-gold-light text-navy border border-gold/30">
              Guest
            </span>
          )}
        </div>
      </td>

      {/* Table · Seat */}
      <td className="py-4 px-4">
        <span className="font-sans text-sm text-text-mid">
          {tableInfo ? `${tableInfo.tableName} · ${seat.seat_number}` : '—'}
        </span>
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge status={reservation.status} />
          {!isGuest && reservation.is_flagged_overage && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-sans text-xs font-medium bg-gold-light text-navy border border-gold/30">
              Fee due
            </span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="py-4 px-4 text-right">
        <div className="flex justify-end gap-2 flex-wrap">
          {reservation.status === 'confirmed' && (
            <button
              onClick={() => onNoShow(reservation.id)}
              disabled={disabled}
              className="px-3 py-1.5 rounded-full font-sans text-xs font-medium border-[1.5px] border-red-300 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
            >
              No Show
            </button>
          )}
          {reservation.status === 'no_show' && !isGuest && (
            <button
              onClick={() => onOverride(reservation.id)}
              disabled={disabled}
              className="px-3 py-1.5 rounded-full font-sans text-xs font-medium border-[1.5px] border-sky-mid text-sky-mid hover:bg-sky-light transition-all disabled:opacity-50"
            >
              Override
            </button>
          )}
          {(reservation.status === 'confirmed' || reservation.status === 'walk_in') && (
            <button
              onClick={() => onNoShow && onNoShow(reservation.id, 'checkin')}
              disabled={disabled}
              className="px-3 py-1.5 rounded-full font-sans text-xs font-medium bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50"
            >
              Check In
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
