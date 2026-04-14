import { supabase } from './supabase.js'

export async function getOrCreateBuddyPass(userId) {
  const { data, error } = await supabase.rpc('get_or_create_buddy_pass', {
    p_owner_id: userId,
  })
  if (error) throw error
  return data
}

// Validates a code without redeeming it — reads buddy_passes table directly.
export async function checkBuddyPassCode(code) {
  const { data, error } = await supabase
    .from('buddy_passes')
    .select('id, code, used_count, max_uses, profiles!owner_id(full_name)')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !data) throw new Error('Code not found. Check the code and try again.')
  if (data.used_count >= data.max_uses) {
    throw new Error('This code has no passes remaining for this month.')
  }

  return {
    ownerName: data.profiles?.full_name?.split(' ')[0] ?? 'a member',
    remaining: data.max_uses - data.used_count,
  }
}

export async function redeemBuddyPass(code, sessionId, seatId, guestName, guestPhone) {
  const { data, error } = await supabase.rpc('redeem_buddy_pass', {
    p_code:        code.toUpperCase(),
    p_session_id:  sessionId,
    p_seat_id:     seatId,
    p_guest_name:  guestName,
    p_guest_phone: guestPhone,
  })
  if (error) throw error
  return { reservation: data }
}
