import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { hasMonthlyLimit } from '../lib/businessRules.js'
import { supabase } from '../services/supabase.js'

export function useMonthlySessionCount() {
  const { profile } = useAuth()
  const [monthlyCount, setMonthlyCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    if (!hasMonthlyLimit(profile.membership_type)) {
      setLoading(false)
      return
    }
    fetchMonthlyCount()
  }, [profile?.id, profile?.membership_type])

  async function fetchMonthlyCount() {
    setLoading(true)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    const { count } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('status', 'checked_in')
      .eq('membership_type_at_booking', 'flower_pass')
      .gte('checked_in_at', monthStart)
      .lt('checked_in_at', monthEnd)

    setMonthlyCount(count ?? 0)
    setLoading(false)
  }

  return { monthlyCount, loading }
}
