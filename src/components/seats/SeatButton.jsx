export default function SeatButton({ seat, selected, selectionIndex = -1, onSelect, isMyExistingSeat = false }) {
  const isAvailable = seat.status === 'available'

  let cls = ''
  if (isMyExistingSeat) {
    cls = 'bg-gold-light border-2 border-gold text-gold cursor-default'
  } else if (selected) {
    cls = 'bg-navy text-sky ring-2 ring-gold ring-offset-1 scale-110 cursor-pointer'
  } else if (isAvailable) {
    cls = 'bg-warm-white border-2 border-navy text-navy hover:bg-sky-pale cursor-pointer'
  } else if (seat.status === 'reserved') {
    cls = 'bg-red-100 text-red-700 border-2 border-red-200 cursor-not-allowed opacity-80'
  } else {
    cls = 'bg-gray-200 text-text-soft border-2 border-gray-200 cursor-not-allowed'
  }

  return (
    <div className="relative inline-flex">
      <button
        onClick={() => !isMyExistingSeat && isAvailable && onSelect(seat)}
        disabled={!isAvailable || isMyExistingSeat}
        title={isMyExistingSeat ? `Seat ${seat.seat_number} — your booking` : `Seat ${seat.seat_number} — ${seat.status}`}
        className={`w-11 h-11 rounded-full font-sans text-xs font-medium transition-all duration-150 flex items-center justify-center ${cls}`}
      >
        {isMyExistingSeat ? (
          <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          seat.seat_number
        )}
      </button>
      {selected && selectionIndex >= 0 && (
        <span
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold flex items-center justify-center font-sans font-bold text-navy pointer-events-none"
          style={{ fontSize: '8px' }}
        >
          {selectionIndex + 1}
        </span>
      )}
    </div>
  )
}
