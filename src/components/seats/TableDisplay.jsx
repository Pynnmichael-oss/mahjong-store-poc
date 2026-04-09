import SeatButton from './SeatButton.jsx'

// Positions: [top, right, bottom, left]
const SEAT_POSITIONS = [
  { top: 0,    left: '50%', transform: 'translate(-50%, -100%) translateY(-8px)' },
  { top: '50%',right: 0,   transform: 'translate(100%, -50%) translateX(8px)'  },
  { bottom: 0, left: '50%', transform: 'translate(-50%, 100%) translateY(8px)'  },
  { top: '50%',left: 0,    transform: 'translate(-100%, -50%) translateX(-8px)' },
]

export default function TableDisplay({ tableName, seats, selectedSeat, onSelect }) {
  return (
    <div className="flex flex-col items-center">
      {/* Outer container — gives room for the seats outside the table surface */}
      <div className="relative flex items-center justify-center" style={{ width: 200, height: 160 }}>

        {/* Table surface */}
        <div
          className="absolute rounded-lg flex items-center justify-center"
          style={{
            width: 100,
            height: 72,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg, #2a5099 0%, #1a3a6b 100%)',
            boxShadow: '0 4px 16px rgba(26,58,107,0.35)',
          }}
        >
          <span className="font-playfair italic text-sky text-xs leading-tight text-center px-1">
            {tableName}
          </span>
        </div>

        {/* 4 seats — top, right, bottom, left */}
        {seats.slice(0, 4).map((seat, i) => (
          <div
            key={seat.id}
            className="absolute"
            style={SEAT_POSITIONS[i]}
          >
            <SeatButton
              seat={seat}
              selected={selectedSeat?.id === seat.id}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>

      {/* Label + availability */}
      <p className="font-sans text-xs text-text-soft mt-1">
        {seats.filter(s => s.status === 'available').length} open
      </p>
    </div>
  )
}
