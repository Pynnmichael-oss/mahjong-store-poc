import SeatButton from './SeatButton.jsx'

// Seat order in data: [seat 1, seat 2, seat 3, seat 4] = [top, right, bottom, left]

export default function TableDisplay({ tableName, seats, selectedSeats = [], onSelect, existingSeatIds = [] }) {
  const [top, right, bottom, left] = seats.slice(0, 4)

  function getSelIdx(seatId) {
    return selectedSeats.findIndex(s => s.id === seatId)
  }

  return (
    <div className="flex flex-col items-center">
      <div className="grid items-center" style={{ gridTemplateColumns: '44px 1fr 44px', gap: '8px' }}>

        {/* Left seat */}
        <div className="flex items-center justify-center">
          {left && (
            <SeatButton
              seat={left}
              selected={getSelIdx(left.id) >= 0}
              selectionIndex={getSelIdx(left.id)}
              onSelect={onSelect}
              isMyExistingSeat={existingSeatIds.includes(left.id)}
            />
          )}
        </div>

        {/* Centre column: top seat → table surface → bottom seat */}
        <div className="flex flex-col items-center gap-2">
          {top && (
            <SeatButton
              seat={top}
              selected={getSelIdx(top.id) >= 0}
              selectionIndex={getSelIdx(top.id)}
              onSelect={onSelect}
              isMyExistingSeat={existingSeatIds.includes(top.id)}
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
              selected={getSelIdx(bottom.id) >= 0}
              selectionIndex={getSelIdx(bottom.id)}
              onSelect={onSelect}
              isMyExistingSeat={existingSeatIds.includes(bottom.id)}
            />
          )}
        </div>

        {/* Right seat */}
        <div className="flex items-center justify-center">
          {right && (
            <SeatButton
              seat={right}
              selected={getSelIdx(right.id) >= 0}
              selectionIndex={getSelIdx(right.id)}
              onSelect={onSelect}
              isMyExistingSeat={existingSeatIds.includes(right.id)}
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
