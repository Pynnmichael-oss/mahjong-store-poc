import { useEffect, useState } from 'react'
import { fetchUserReservations, fetchSessionReservations } from '../services/reservationService.js'

export function useUserReservations(userId) {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) return
    fetchUserReservations(userId)
      .then(setReservations)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [userId])

  function refresh() {
    if (!userId) return
    fetchUserReservations(userId).then(setReservations).catch(setError)
  }

  return { reservations, loading, error, refresh }
}

export function useSessionReservations(sessionId) {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!sessionId) return
    fetchSessionReservations(sessionId)
      .then(setReservations)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [sessionId])

  function refresh() {
    if (!sessionId) return
    fetchSessionReservations(sessionId).then(setReservations).catch(setError)
  }

  return { reservations, loading, error, refresh }
}
