import SeatButton from './SeatButton.jsx'

export default function SeatMap({ seats, selectedSeat, onSelect }) {
  return (
    <div>
      <div className="flex gap-4 text-xs text-gray-500 mb-4">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block" /> Available</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200 inline-block" /> Reserved</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> Occupied</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {seats.map(seat => (
          <SeatButton
            key={seat.id}
            seat={seat}
            selected={selectedSeat?.id === seat.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}
