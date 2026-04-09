export default function SeatButton({ seat, selected, onSelect }) {
  const isAvailable = seat.status === 'available'

  let cls = ''
  if (selected) {
    cls = 'bg-navy text-sky ring-2 ring-gold ring-offset-1 scale-110 cursor-pointer'
  } else if (seat.status === 'available') {
    cls = 'bg-warm-white border-2 border-navy text-navy hover:bg-sky-pale cursor-pointer'
  } else if (seat.status === 'reserved') {
    cls = 'bg-red-100 text-red-700 border-2 border-red-200 cursor-not-allowed opacity-80'
  } else {
    cls = 'bg-gray-200 text-text-soft border-2 border-gray-200 cursor-not-allowed'
  }

  return (
    <button
      onClick={() => isAvailable && onSelect(seat)}
      disabled={!isAvailable}
      title={`Seat ${seat.seat_number} — ${seat.status}`}
      className={`w-11 h-11 rounded-full font-sans text-xs font-medium transition-all duration-150 flex items-center justify-center ${cls}`}
    >
      {seat.seat_number}
    </button>
  )
}
