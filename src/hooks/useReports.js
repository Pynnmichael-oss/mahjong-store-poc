import { useEffect, useState } from 'react'
import { fetchSessionsInRange } from '../services/sessionService.js'
import { fetchSessionReservations } from '../services/reservationService.js'

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

