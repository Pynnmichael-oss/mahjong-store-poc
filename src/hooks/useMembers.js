import { useEffect, useState } from 'react'
import { fetchAllMembers } from '../services/memberService.js'

export function useMembers() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAllMembers().then(setMembers).catch(setError).finally(() => setLoading(false))
  }, [])

  function refresh() {
    fetchAllMembers().then(setMembers).catch(setError)
  }

  return { members, loading, error, refresh }
}
