import SeatButton from './SeatButton.jsx'

const CONTAINER = 300
const TABLE_R   = 72
const SEAT_ORBIT = 112

export default function TableDisplay({ tableName, seats, selectedSeat, onSelect }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative flex items-center justify-center"
        style={{ width: CONTAINER, height: CONTAINER }}
      >
        {/* Table felt circle */}
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: TABLE_R * 2,
            height: TABLE_R * 2,
            background: 'radial-gradient(circle at 38% 35%, #2a5099, #1a3a6b)',
            boxShadow: '0 8px 32px rgba(26,58,107,0.4)',
          }}
        >
          <span className="font-playfair italic text-sky text-sm">{tableName}</span>
        </div>

        {/* Seats arranged in a circle */}
        {seats.map((seat, i) => {
          const angleDeg = (i / 8) * 360 - 90
          const angleRad = (angleDeg * Math.PI) / 180
          const x = CONTAINER / 2 + SEAT_ORBIT * Math.cos(angleRad) - 22
          const y = CONTAINER / 2 + SEAT_ORBIT * Math.sin(angleRad) - 22
          return (
            <div key={seat.id} className="absolute" style={{ left: x, top: y }}>
              <SeatButton
                seat={seat}
                selected={selectedSeat?.id === seat.id}
                onSelect={onSelect}
              />
            </div>
          )
        })}
      </div>

      {/* Table label + availability */}
      <div className="text-center mt-1">
        <p className="font-playfair text-navy text-sm">{tableName} Table</p>
        <p className="font-sans text-xs text-text-soft mt-0.5">
          {seats.filter(s => s.status === 'available').length} open
          {seats.filter(s => s.status === 'reserved').length > 0 &&
            ` · ${seats.filter(s => s.status === 'reserved').length} taken`}
        </p>
      </div>
    </div>
  )
}
