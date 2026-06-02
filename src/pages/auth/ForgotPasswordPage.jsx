import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../services/supabase.js'
import FloatingTiles from '../../components/layout/FloatingTiles.jsx'
import Alert from '../../components/ui/Alert.jsx'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [sent, setSent]       = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (authError) {
      setError(authError.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-navy relative flex items-center justify-center px-4 overflow-hidden">
      <FloatingTiles />
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-warm-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <h1 className="font-playfair text-3xl text-navy">
              Reset <em className="text-sky-mid">Password</em>
            </h1>
            <p className="font-cormorant italic text-text-mid text-lg mt-1">
              We'll send you a link by email
            </p>
          </div>

          {error && <Alert type="error" className="mb-5">{error}</Alert>}

          {sent ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-center">
                <p className="font-sans text-sm text-green-700 font-medium">Check your email</p>
                <p className="font-cormorant italic text-green-700 text-base mt-1">
                  We've sent a reset link to {email}. If you don't see it, check your spam folder.
                </p>
              </div>
              <Link
                to="/login"
                className="block text-center font-sans text-sm text-text-soft hover:text-navy transition-colors"
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
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
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-navy text-sky rounded-full py-3 font-sans font-medium text-base hover:bg-navy-deep transition-all duration-200 disabled:opacity-50 mt-2"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <Link
                to="/login"
                className="block text-center font-sans text-sm text-text-soft hover:text-navy transition-colors mt-4"
              >
                ← Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
