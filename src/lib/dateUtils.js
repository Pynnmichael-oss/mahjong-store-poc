const TZ = 'America/Chicago'

/** Format a date string as "Mon, Jan 6" */
export function formatSessionDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Format time string "HH:MM:SS" → "2:30 PM" */
export function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const date = new Date()
  date.setHours(Number(h), Number(m))
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** Get current time in America/Chicago as a Date */
export function nowInChicago() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
}

/** Monday 00:00 and Sunday 23:59 in America/Chicago for the current week */
export function getWeekBoundaries() {
  const now = nowInChicago()
  const day = now.getDay() // 0=Sun, 1=Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return { weekStart: monday, weekEnd: sunday }
}

/** Convert a session date + start_time string to a Date (Chicago TZ assumed) */
export function sessionStartDate(session) {
  return new Date(`${session.date}T${session.start_time}`)
}
