import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { getOrCreateBuddyPass } from '../services/buddyPassService.js'

export function useBuddyPass() {
  const { profile } = useAuth()
  const [pass, setPass] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function refresh() {
    if (profile?.membership_type !== 'subscriber') return
    setLoading(true)
    setError(null)
    try {
      const data = await getOrCreateBuddyPass(profile.id)
      setPass({
        ...data,
        passes_remaining: (data.max_uses ?? 2) - (data.used_count ?? 0),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [profile?.id, profile?.membership_type])

  return { pass, loading, error, refresh }
}
