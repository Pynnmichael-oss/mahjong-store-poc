import { supabase } from './supabase.js'

export async function fetchSeatsBySession(sessionId) {
  const { data, error } = await supabase
    .from('seats')
    .select('*')
    .eq('session_id', sessionId)
    .order('seat_number', { ascending: true })
  if (error) throw error
  return data
}

export async function updateSeatStatus(seatId, status) {
  const { error } = await supabase
    .from('seats')
    .update({ status })
    .eq('id', seatId)
  if (error) throw error
}
