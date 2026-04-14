import { useEffect, useState } from 'react'
import { fetchUpcomingSessions, fetchTodaysSessions, fetchSessionById } from '../services/sessionService.js'

export function useSessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  function refetch() {
    setLoading(true)
    fetchUpcomingSessions().then(setSessions).catch(setError).finally(() => setLoading(false))
  }

  useEffect(() => { refetch() }, [])

  return { sessions, loading, error, refetch }
}

export function useTodaysSessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTodaysSessions().then(setSessions).catch(setError).finally(() => setLoading(false))
  }, [])

  return { sessions, loading, error }
}

export function useSession(sessionId) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!sessionId) return
    fetchSessionById(sessionId).then(setSession).catch(setError).finally(() => setLoading(false))
  }, [sessionId])

  return { session, loading, error }
}
