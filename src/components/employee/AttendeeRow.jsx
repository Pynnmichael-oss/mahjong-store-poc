import Badge from '../ui/Badge.jsx'
import { getTableForSeat, getMembershipBadgeClasses, getMembershipLabel, BUDDY_PASS_ENABLED } from '../../lib/businessRules.js'

import { getWeeklyLimit } from '../../lib/businessRules.js'

export default function AttendeeRow({ reservation, onNoShow, onOverride, onPayCheckin, onCheckin, weeklyCount, disabled, index }) {
  const profile  = reservation.profiles
  const seat     = reservation.seats
  const tableInfo = seat ? getTableForSeat(seat.seat_number) : null
  const isAlt    = index % 2 === 1
  const isGuest        = reservation.is_guest === true
  const isBuddyPass    = BUDDY_PASS_ENABLED && reservation.is_buddy_pass === true
  const isDragonPass   = !isGuest && profile?.membership_type === 'dragon_pass'
  const memberTier     = !isGuest ? profile?.membership_type : null
  const name           = isGuest ? reservation.guest_name : profile?.full_name
  const weeklyLimit    = memberTier ? getWeeklyLimit(memberTier) : null
  const sessionsLeft   = weeklyLimit !== null && weeklyCount != null
    ? Math.max(0, weeklyLimit - weeklyCount) : null

  return (
    <tr className={`border-b border-navy/5 last:border-0 ${isAlt ? 'bg-sky-pale' : 'bg-white'}`}>
      {/* Name */}
      <td className="py-4 px-4 min-h-[56px]">
        <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-sans font-medium text-navy text-sm">
            {isDragonPass && <span className="mr-1">⭐</span>}{name ?? '—'}
          </span>
          {isBuddyPass ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-sans text-xs font-medium bg-gold text-navy">
              Buddy Pass
            </span>
          ) : isGuest ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-sans text-xs font-medium bg-gold-light text-navy border border-gold/30">
              Guest
            </span>
          ) : memberTier && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-sans text-xs font-medium ${getMembershipBadgeClasses(memberTier)}`}>
              {memberTier === 'founding_member' && (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z"/>
                </svg>
              )}
              {getMembershipLabel(memberTier)}
            </span>
          )}
        </div>
        {sessionsLeft !== null && reservation.status !== 'checked_in' && (
          <span className={`font-sans text-xs ${sessionsLeft === 0 ? 'text-gold font-medium' : 'text-text-soft'}`}>
            {sessionsLeft === 0 ? 'Weekly limit reached' : `${sessionsLeft} session${sessionsLeft !== 1 ? 's' : ''} left this week`}
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
          {(reservation.status === 'confirmed' || reservation.status === 'walk_in') && (() => {
            const needsPayment = reservation.is_walk_in || reservation.is_flagged_overage
            return needsPayment ? (
              <button
                onClick={() => onPayCheckin?.(reservation)}
                disabled={disabled}
                className="px-3 py-1.5 rounded-full font-sans text-xs font-medium bg-gold text-navy hover:bg-gold/80 transition-all disabled:opacity-50"
              >
                Pay &amp; Check In
              </button>
            ) : (
              <button
                onClick={() => onCheckin?.(reservation)}
                disabled={disabled}
                className="px-3 py-1.5 rounded-full font-sans text-xs font-medium bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50"
              >
                Check In
              </button>
            )
          })()}
        </div>
      </td>
    </tr>
  )
}
