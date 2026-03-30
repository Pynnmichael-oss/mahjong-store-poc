import { useEffect, useState } from 'react'
import { fetchSeatsBySession } from '../services/seatService.js'

export function useSeats(sessionId) {
  const [seats, setSeats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!sessionId) return
    fetchSeatsBySession(sessionId)
      .then(setSeats)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [sessionId])

  function refreshSeats() {
    setLoading(true)
    fetchSeatsBySession(sessionId)
      .then(setSeats)
      .catch(setError)
      .finally(() => setLoading(false))
  }

  return { seats, loading, error, refreshSeats }
}
