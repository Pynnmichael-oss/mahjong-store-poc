import TableDisplay from './TableDisplay.jsx'
import { TABLE_NAMES } from '../../lib/businessRules.js'

export default function SeatMap({ seats, selectedSeat, onSelect }) {
  const tables = TABLE_NAMES.map((name, tableIndex) => ({
    name,
    seats: seats.filter(s => {
      const start = tableIndex * 8 + 1
      const end = start + 7
      return s.seat_number >= start && s.seat_number <= end
    }),
  }))

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="flex gap-5 justify-center mb-6">
        {[
          { cls: 'bg-warm-white border-2 border-navy', label: 'Available' },
          { cls: 'bg-navy',                            label: 'Selected' },
          { cls: 'bg-red-100 border-2 border-red-200', label: 'Taken' },
          { cls: 'bg-gray-200',                         label: 'Occupied' },
        ].map(({ cls, label }) => (
          <span key={label} className="flex items-center gap-1.5 font-sans text-xs text-text-soft">
            <span className={`w-3 h-3 rounded-full inline-block flex-shrink-0 ${cls}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Top 3 tables */}
      <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-4">
        {tables.slice(0, 3).map(t => (
          <TableDisplay
            key={t.name}
            tableName={t.name}
            seats={t.seats}
            selectedSeat={selectedSeat}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Bottom 2 tables — centered */}
      <div className="flex flex-wrap justify-center gap-4 sm:gap-8">
        {tables.slice(3).map(t => (
          <TableDisplay
            key={t.name}
            tableName={t.name}
            seats={t.seats}
            selectedSeat={selectedSeat}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}
