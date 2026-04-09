import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase.js'
import FloatingTiles from '../../components/layout/FloatingTiles.jsx'
import Alert from '../../components/ui/Alert.jsx'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    navigate(profile?.role === 'employee' ? '/employee' : '/dashboard', { replace: true })
  }

  const inputCls = 'w-full bg-white/10 border border-sky/20 rounded-full px-5 py-3 text-base font-sans text-white placeholder:text-sky/40 focus:outline-none focus:ring-2 focus:ring-sky/50 focus:border-sky/40 transition-all'

  return (
    <div className="min-h-screen bg-navy relative flex items-center justify-center px-4 overflow-hidden">
      <FloatingTiles />

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div className="bg-warm-white rounded-2xl shadow-2xl p-8">
          {/* Brand */}
          <div className="text-center mb-8">
            <h1 className="font-playfair text-3xl text-navy">
              Four <em className="text-sky-mid">Winds</em>
            </h1>
            <p className="font-cormorant italic text-text-mid text-lg mt-1">
              Mahjong Club &amp; Event Space
            </p>
            <p className="font-sans text-xs text-text-soft mt-1 tracking-wide">
              Coming soon to Tulsa, Oklahoma
            </p>
          </div>

          {error && <Alert type="error" className="mb-5">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-sans text-sm font-medium text-text-mid mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-white border border-navy/20 rounded-full px-5 py-3 text-base font-sans text-navy placeholder:text-text-soft focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy/40 transition-all"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block font-sans text-sm font-medium text-text-mid mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-white border border-navy/20 rounded-full px-5 py-3 text-base font-sans text-navy placeholder:text-text-soft focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy/40 transition-all"
                style={{ fontSize: '16px' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy text-sky rounded-full py-3 font-sans font-medium text-base hover:bg-navy-deep transition-all duration-200 disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center font-sans text-sm text-text-soft mt-6">
            New here?{' '}
            <Link to="/signup" className="text-sky-mid hover:text-navy font-medium transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
