import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { hasWeeklyLimit } from '../lib/businessRules.js'
import { getWeekBoundaries } from '../lib/dateUtils.js'
import { supabase } from '../services/supabase.js'

export function useWeeklySessionCount() {
  const { profile } = useAuth()
  const [weeklyCount, setWeeklyCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    if (!hasWeeklyLimit(profile.membership_type)) {
      setLoading(false)
      return
    }
    fetchWeeklyCount()
  }, [profile?.id, profile?.membership_type])

  async function fetchWeeklyCount() {
    setLoading(true)

    // Scope to the CURRENT calendar week (Mon–Sun)
    // This hook is used for display only (profile page, header)
    // It shows how many sessions the member has used THIS week
    const { weekStart, weekEnd } = getWeekBoundaries()

    const { data } = await supabase
      .from('reservations')
      .select('sessions!inner(date)')
      .eq('user_id', profile.id)
      .eq('is_primary_seat', true)
      .in('status', ['confirmed', 'walk_in', 'checked_in'])
      .gte('sessions.date', weekStart.toISOString().split('T')[0])
      .lte('sessions.date', weekEnd.toISOString().split('T')[0])

    setWeeklyCount(data?.length ?? 0)
    setLoading(false)
  }

  return { weeklyCount, loading }
}

// Backward-compat alias
export const useMonthlySessionCount = useWeeklySessionCount
