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
  // Tag as America/Chicago so Supabase stores the correct UTC offset
  const toChicago = (dateStr, timeStr) => {
    const naive = `${dateStr}T${timeStr}`
    // Create a date as if it's Chicago time by using the offset
    const d = new Date(naive)
    // Get Chicago offset in minutes using Intl
    const chicagoOffset = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      timeZoneName: 'shortOffset',
    }).formatToParts(d).find(p => p.type === 'timeZoneName')?.value ?? 'GMT-5'
    const sign  = chicagoOffset.includes('+') ? 1 : -1
    const parts = chicagoOffset.replace('GMT', '').replace('+', '').replace('-', '').split(':')
    const offsetMins = sign * (parseInt(parts[0] ?? '5') * 60 + parseInt(parts[1] ?? '0'))
    const utc = new Date(d.getTime() - offsetMins * 60 * 1000)
    return utc.toISOString()
  }

  const { data, error } = await supabase.rpc('create_session_with_seats', {
    p_date:       date,
    p_start_time: toChicago(date, startTime),
    p_end_time:   toChicago(date, endTime),
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
