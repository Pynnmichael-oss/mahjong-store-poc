import { supabase } from './supabase.js'

export async function fetchUpcomingEvents() {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('events')
    .select('*, event_rsvps(id, user_id, status)')
    .gte('event_date', today)
    .eq('status', 'upcoming')
    .order('event_date', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchAllEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*, event_rsvps(id, user_id, status)')
    .order('event_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createEvent(payload) {
  const { data, error } = await supabase
    .from('events')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEventStatus(eventId, status) {
  const { data, error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function rsvpToEvent(eventId, userId) {
  // Fresh counts from DB — prevents overbooking when multiple users RSVP simultaneously
  const [{ count }, { data: eventData }] = await Promise.all([
    supabase
      .from('event_rsvps')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'confirmed'),
    supabase
      .from('events')
      .select('capacity')
      .eq('id', eventId)
      .single(),
  ])

  const status = (count ?? 0) < (eventData?.capacity ?? 0) ? 'confirmed' : 'waitlisted'

  const { data, error } = await supabase
    .from('event_rsvps')
    .insert({ event_id: eventId, user_id: userId, status })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('You are already registered for this event.')
    throw error
  }
  return data
}

export async function cancelRsvp(rsvpId) {
  const { data, error } = await supabase
    .from('event_rsvps')
    .update({ status: 'cancelled' })
    .eq('id', rsvpId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchEventRsvps(eventId) {
  const { data, error } = await supabase
    .from('event_rsvps')
    .select('*, profiles(full_name, email)')
    .eq('event_id', eventId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}
