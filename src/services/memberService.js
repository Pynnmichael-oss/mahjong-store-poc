import { supabase } from './supabase.js'

export async function fetchAllMembers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'customer')
    .order('full_name', { ascending: true })
  if (error) throw error
  return data
}

export async function updateMembershipType(userId, membershipType) {
  const { error } = await supabase
    .from('profiles')
    .update({ membership_type: membershipType })
    .eq('id', userId)
  if (error) throw error
}

export async function updateMemberActiveStatus(userId, isActive) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
  if (error) throw error
}
