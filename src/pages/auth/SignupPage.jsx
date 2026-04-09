import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase.js'
import FloatingTiles from '../../components/layout/FloatingTiles.jsx'
import Alert from '../../components/ui/Alert.jsx'

export default function SignupPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { data, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id, full_name: fullName, email,
      role: 'customer', membership_type: 'walk_in', is_active: true,
    })
    if (profileError) { setError(profileError.message); setLoading(false); return }
    navigate('/dashboard', { replace: true })
  }

  const inputCls = 'w-full bg-white border border-navy/20 rounded-full px-5 py-3 text-base font-sans text-navy placeholder:text-text-soft focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy/40 transition-all'

  return (
    <div className="min-h-screen bg-navy relative flex items-center justify-center px-4 overflow-hidden">
      <FloatingTiles />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-warm-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="font-playfair text-3xl text-navy">
              Join Four <em className="text-sky-mid">Winds</em>
            </h1>
            <p className="font-cormorant italic text-text-mid text-lg mt-1">
              Create your member account
            </p>
          </div>

          {error && <Alert type="error" className="mb-5">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-sans text-sm font-medium text-text-mid mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                autoComplete="name"
                className={inputCls}
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block font-sans text-sm font-medium text-text-mid mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputCls}
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
                minLength={6}
                autoComplete="new-password"
                className={inputCls}
                style={{ fontSize: '16px' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy text-sky rounded-full py-3 font-sans font-medium text-base hover:bg-navy-deep transition-all duration-200 disabled:opacity-50 mt-2"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center font-sans text-sm text-text-soft mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-sky-mid hover:text-navy font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
