import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase.js'
import { fetchSessionsInRange } from '../services/sessionService.js'
import { fetchSessionReservations } from '../services/reservationService.js'
import { getWeekBoundaries } from '../lib/dateUtils.js'

export function useFillRateReport(startDate, endDate) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!startDate || !endDate) return
    setLoading(true)
    setData([])

    async function load() {
      try {
        const sessions = await fetchSessionsInRange(startDate, endDate)
        const results = await Promise.all(
          sessions.map(async sess => {
            const reservations = await fetchSessionReservations(sess.id)
            return { session: sess, reservations }
          })
        )
        setData(results)
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [startDate, endDate])

  return { data, loading, error }
}

export function useWeeklyPlaysReport(weekStartStr, weekEndStr) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!weekStartStr || !weekEndStr) return
    setLoading(true)
    setData([])

    async function load() {
      try {
        const sessions = await fetchSessionsInRange(weekStartStr, weekEndStr)
        const sessionIds = sessions.map(s => s.id)

        if (sessionIds.length === 0) {
          setData([])
          return
        }

        const { data: reservations, error: resErr } = await supabase
          .from('reservations')
          .select('user_id, status, session_id, is_flagged_overage, profiles!user_id(full_name, membership_type)')
          .in('session_id', sessionIds)
          .eq('status', 'checked_in')
          .eq('is_guest', false)

        if (resErr) throw resErr

        const byUser = {}
        reservations.forEach(r => {
          const profile = r.profiles
          if (!profile || profile.membership_type !== 'subscriber') return
          if (!byUser[r.user_id]) {
            byUser[r.user_id] = {
              userId: r.user_id,
              name: profile.full_name,
              count: 0,
              flagged: false,
            }
          }
          byUser[r.user_id].count++
          if (r.is_flagged_overage) byUser[r.user_id].flagged = true
        })

        setData(Object.values(byUser).sort((a, b) => b.count - a.count))
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [weekStartStr, weekEndStr])

  return { data, loading, error }
}
