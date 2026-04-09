const TILES = [
  { size: 32, left: '8%',  delay: 0,    duration: 18 },
  { size: 24, left: '16%', delay: 3,    duration: 22 },
  { size: 44, left: '24%', delay: 7,    duration: 26 },
  { size: 20, left: '33%', delay: 1,    duration: 15 },
  { size: 38, left: '41%', delay: 9,    duration: 20 },
  { size: 28, left: '50%', delay: 4,    duration: 28 },
  { size: 36, left: '58%', delay: 6,    duration: 17 },
  { size: 22, left: '66%', delay: 11,   duration: 24 },
  { size: 42, left: '74%', delay: 2,    duration: 19 },
  { size: 26, left: '82%', delay: 8,    duration: 23 },
  { size: 34, left: '90%', delay: 5,    duration: 30 },
  { size: 20, left: '12%', delay: 14,   duration: 21 },
  { size: 48, left: '28%', delay: 12,   duration: 16 },
  { size: 30, left: '45%', delay: 16,   duration: 27 },
  { size: 40, left: '62%', delay: 10,   duration: 13 },
  { size: 22, left: '78%', delay: 18,   duration: 32 },
  { size: 36, left: '3%',  delay: 15,   duration: 25 },
  { size: 28, left: '95%', delay: 13,   duration: 14 },
]

export default function FloatingTiles() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {TILES.map((tile, i) => (
        <div
          key={i}
          className="floating-tile"
          style={{
            width: tile.size,
            height: tile.size,
            left: tile.left,
            bottom: '-60px',
            animationDuration: `${tile.duration}s`,
            animationDelay: `${tile.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
