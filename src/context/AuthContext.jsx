import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    console.log('[AuthContext] fetchProfile — role:', data?.role ?? 'null', '| error:', error?.message ?? 'none')
    if (!error) setProfile(data)
    return data?.role
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      console.log('[AuthContext] getSession — user:', u?.id ?? 'null')
      setUser(u)
      if (u) fetchProfile(u.id).finally(() => { console.log('[AuthContext] loading → false'); setLoading(false) })
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      console.log('[AuthContext] onAuthStateChange — event:', _event, '| user:', u?.id ?? 'null')
      setUser(u)
      if (u) fetchProfile(u.id).then(p => console.log('[AuthContext] profile refetched — role:', p))
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const isEmployee = profile?.role === 'employee'

  return (
    <AuthContext.Provider value={{ user, profile, isEmployee, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
