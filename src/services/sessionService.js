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

// Calls the create_session_with_seats(DATE, TIME, TIME) Postgres function.
// Returns the new session UUID, or null if a session for that date+time already exists.
export async function createSessionWithSeats(date, startTime, endTime) {
  const { data, error } = await supabase.rpc('create_session_with_seats', {
    p_date:       date,
    p_start_time: startTime,
    p_end_time:   endTime,
  })
  if (error) throw error
  return data
}

export async function fetchUpcomingSessions() {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .gte('date', today)
    .eq('status', 'open')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
  if (error) throw error
  return data
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
