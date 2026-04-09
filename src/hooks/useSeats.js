import { useEffect, useState } from 'react'
import { fetchSeatsBySession } from '../services/seatService.js'

export function useSeats(sessionId) {
  const [seats, setSeats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!sessionId) return
    fetchSeatsBySession(sessionId).then(setSeats).catch(setError).finally(() => setLoading(false))
  }, [sessionId])

  function refreshSeats() {
    if (!sessionId) return
    fetchSeatsBySession(sessionId).then(setSeats).catch(setError)
  }

  return { seats, loading, error, refreshSeats }
}
