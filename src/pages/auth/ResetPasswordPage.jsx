import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase.js'
import FloatingTiles from '../../components/layout/FloatingTiles.jsx'
import Alert from '../../components/ui/Alert.jsx'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword]       = useState('')
  const [confirmPassword, setConfirm] = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [success, setSuccess]         = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checking, setChecking]       = useState(true)

  // Verify we landed here from a valid reset email link
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setValidSession(!!session)
      setChecking(false)
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: authError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }
    setSuccess(true)
    // Sign out the temporary recovery session so user must log in with new password
    await supabase.auth.signOut()
    setTimeout(() => navigate('/login', { replace: true }), 2500)
  }

  return (
    <div className="min-h-screen bg-navy relative flex items-center justify-center px-4 overflow-hidden">
      <FloatingTiles />
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-warm-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <h1 className="font-playfair text-3xl text-navy">
              Set New <em className="text-sky-mid">Password</em>
            </h1>
            <p className="font-cormorant italic text-text-mid text-lg mt-1">
              Choose a new password for your account
            </p>
          </div>

          {error && <Alert type="error" className="mb-5">{error}</Alert>}

          {checking ? (
            <p className="text-center font-cormorant italic text-text-mid">Verifying reset link…</p>
          ) : !validSession ? (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 text-center">
              <p className="font-sans text-sm text-red-700 font-medium">Invalid or expired reset link</p>
              <p className="font-cormorant italic text-red-700 text-base mt-1">
                Please request a new password reset email.
              </p>
            </div>
          ) : success ? (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-center">
              <p className="font-sans text-sm text-green-700 font-medium">Password updated</p>
              <p className="font-cormorant italic text-green-700 text-base mt-1">
                Redirecting you to sign in…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-sans text-sm font-medium text-text-mid mb-1.5">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="w-full bg-white border border-navy/20 rounded-full px-5 py-3 text-base font-sans text-navy placeholder:text-text-soft focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy/40 transition-all"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div>
                <label className="block font-sans text-sm font-medium text-text-mid mb-1.5">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full bg-white border border-navy/20 rounded-full px-5 py-3 text-base font-sans text-navy placeholder:text-text-soft focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy/40 transition-all"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-navy text-sky rounded-full py-3 font-sans font-medium text-base hover:bg-navy-deep transition-all duration-200 disabled:opacity-50 mt-2"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
