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
    const { weekStart, weekEnd } = getWeekBoundaries()

    const { count } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_primary_seat', true)
      .in('status', ['confirmed', 'walk_in', 'checked_in'])
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())

    setWeeklyCount(count ?? 0)
    setLoading(false)
  }

  return { weeklyCount, loading }
}

// Backward-compat alias
export const useMonthlySessionCount = useWeeklySessionCount
