import { supabase } from './supabase.js'

export async function fetchSessionsInRange(startDate, endDate) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
  if (error) throw error
  return data
}

export async function cancelSession(sessionId) {
  const { error } = await supabase
    .from('sessions')
    .update({ status: 'cancelled' })
    .eq('id', sessionId)
  if (error) throw error
}

// Calls the create_session_with_seats Postgres function.
// Accepts bare time strings ("10:00:00") and combines with date for TIMESTAMPTZ params.
// Returns the new session UUID, or null if a session for that date+time already exists.
export async function createSessionWithSeats(date, startTime, endTime) {
  // Get the Chicago UTC offset for the given date using Intl
  function getChicagoOffset(dateStr, timeStr) {
    const dt = new Date(`${dateStr}T${timeStr}`)
    const utcDate = new Date(dt.toLocaleString('en-US', { timeZone: 'UTC' }))
    const chicagoDate = new Date(dt.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
    // offsetMins is positive when Chicago is behind UTC (which it always is)
    const offsetMins = (utcDate - chicagoDate) / 60000
    const sign = offsetMins >= 0 ? '-' : '+'
    const abs = Math.abs(offsetMins)
    const h = String(Math.floor(abs / 60)).padStart(2, '0')
    const m = String(abs % 60).padStart(2, '0')
    return `${sign}${h}:${m}`
  }

  const startOffset = getChicagoOffset(date, startTime)
  const endOffset   = getChicagoOffset(date, endTime)

  const { data, error } = await supabase.rpc('create_session_with_seats', {
    p_date:       date,
    p_start_time: `${date}T${startTime}${startOffset}`,
    p_end_time:   `${date}T${endTime}${endOffset}`,
  })
  if (error) throw error
  return data
}

export async function fetchUpcomingSessions() {
  const today = new Date().toISOString().split('T')[0]
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, date, start_time, end_time, status, total_seats')
    .gte('date', today)
    .eq('status', 'open')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
  if (error) throw error

  return Promise.all(
    (sessions ?? []).map(async session => {
      const { data: count } = await supabase
        .rpc('get_session_availability', { p_session_id: session.id })
      const reservedCount  = count ?? 0
      const availableSeats = Math.max(0, session.total_seats - reservedCount)
      const isFull         = availableSeats <= 0
      return { ...session, reservedCount, availableSeats, isFull }
    })
  )
}

export async function fetchSessionById(sessionId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  if (error) throw error
  return data
}

export async function fetchTodaysSessions() {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('date', today)
    .order('start_time', { ascending: true })
  if (error) throw error
  return data
}
