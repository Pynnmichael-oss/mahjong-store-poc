import SeatButton from './SeatButton.jsx'

// Seat order in data: [seat 1, seat 2, seat 3, seat 4] = [top, right, bottom, left]

export default function TableDisplay({ tableName, seats, selectedSeat, onSelect }) {
  const [top, right, bottom, left] = seats.slice(0, 4)

  return (
    <div className="flex flex-col items-center">
      <div className="grid items-center" style={{ gridTemplateColumns: '44px 1fr 44px', gap: '8px' }}>

        {/* Left seat */}
        <div className="flex items-center justify-center">
          {left && (
            <SeatButton
              seat={left}
              selected={selectedSeat?.id === left.id}
              onSelect={onSelect}
            />
          )}
        </div>

        {/* Centre column: top seat → table surface → bottom seat */}
        <div className="flex flex-col items-center gap-2">
          {top && (
            <SeatButton
              seat={top}
              selected={selectedSeat?.id === top.id}
              onSelect={onSelect}
            />
          )}

          <div
            className="rounded-xl flex items-center justify-center px-4 py-3 w-full"
            style={{
              background: 'linear-gradient(135deg, #2a5099 0%, #1a3a6b 100%)',
              boxShadow: '0 4px 16px rgba(26,58,107,0.35)',
              minHeight: 56,
            }}
          >
            <span className="font-playfair italic text-sky text-xs leading-tight text-center">
              {tableName}
            </span>
          </div>

          {bottom && (
            <SeatButton
              seat={bottom}
              selected={selectedSeat?.id === bottom.id}
              onSelect={onSelect}
            />
          )}
        </div>

        {/* Right seat */}
        <div className="flex items-center justify-center">
          {right && (
            <SeatButton
              seat={right}
              selected={selectedSeat?.id === right.id}
              onSelect={onSelect}
            />
          )}
        </div>
      </div>

      <p className="font-sans text-xs text-text-soft mt-2">
        {seats.filter(s => s.status === 'available').length} open
      </p>
    </div>
  )
}
