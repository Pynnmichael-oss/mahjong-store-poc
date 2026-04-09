import { useEffect, useState } from 'react'
import { fetchUpcomingEvents, fetchAllEvents } from '../services/eventService.js'

export function useEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchUpcomingEvents().then(setEvents).catch(setError).finally(() => setLoading(false))
  }, [])

  function refresh() {
    fetchUpcomingEvents().then(setEvents).catch(setError)
  }

  return { events, loading, error, refresh }
}

export function useAllEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAllEvents().then(setEvents).catch(setError).finally(() => setLoading(false))
  }, [])

  function refresh() {
    fetchAllEvents().then(setEvents).catch(setError)
  }

  return { events, loading, error, refresh }
}
