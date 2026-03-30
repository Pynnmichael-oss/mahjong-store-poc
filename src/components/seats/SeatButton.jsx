const statusStyles = {
  available: 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200 cursor-pointer',
  reserved: 'bg-yellow-100 border-yellow-300 text-yellow-700 cursor-not-allowed',
  occupied: 'bg-red-100 border-red-300 text-red-700 cursor-not-allowed',
}

export default function SeatButton({ seat, selected, onSelect }) {
  const isAvailable = seat.status === 'available'
  return (
    <button
      onClick={() => isAvailable && onSelect(seat)}
      disabled={!isAvailable}
      className={`w-12 h-12 rounded-lg border-2 text-xs font-bold transition-colors
        ${statusStyles[seat.status] || 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}
        ${selected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
      `}
    >
      {seat.seat_number}
    </button>
  )
}
