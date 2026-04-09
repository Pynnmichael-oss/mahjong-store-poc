const TZ = 'America/Chicago'

export function formatSessionDate(dateStr) {
  if (!dateStr) return '—'
  // Full ISO timestamp (TIMESTAMPTZ column) — extract date portion
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
  // Use noon local time to avoid timezone day-shift on date-only strings
  const date = new Date(datePart + 'T12:00:00')
  if (isNaN(date)) return '—'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatTime(timeStr) {
  if (!timeStr) return ''
  // Full ISO timestamp (TIMESTAMPTZ) — parse directly
  if (timeStr.includes('T')) {
    const date = new Date(timeStr)
    if (!isNaN(date)) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  // Plain time "HH:MM:SS"
  const [h, m] = timeStr.split(':')
  const date = new Date()
  date.setHours(Number(h), Number(m), 0, 0)
  if (isNaN(date)) return ''
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function nowInChicago() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
}

export function getWeekBoundaries() {
  const now = nowInChicago()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { weekStart: monday, weekEnd: sunday }
}

export function sessionStartDate(session) {
  return new Date(`${session.date}T${session.start_time}`)
}
