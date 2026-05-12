import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase.js'
import { saveCard, chargeCardOnFile } from '../../services/cardService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import FloatingTiles from '../../components/layout/FloatingTiles.jsx'
import Alert from '../../components/ui/Alert.jsx'

// ─── Membership plan definitions (signup-specific) ────────────────────────────
const PLANS = [
  {
    key: 'dragon_pass',
    name: 'Dragon Pass',
    price: '$149.99',
    period: '/mo',
    amountCents: 14999,
    border: 'border-t-4 border-gold',
    selectedBorder: 'border-2 border-gold',
    btn: 'bg-navy text-sky hover:bg-navy-deep',
    benefits: [
      'Unlimited sessions — 7 days a week',
      '2 buddy passes per month',
      '15% off events + early access',
    ],
  },
  {
    key: 'flower_pass',
    name: 'Flower Pass',
    price: '$79.99',
    period: '/mo',
    amountCents: 7999,
    border: 'border-t-4 border-sky-mid',
    selectedBorder: 'border-2 border-sky-mid',
    btn: 'bg-sky-mid text-navy hover:bg-sky',
    benefits: [
      '2 sessions per week',
      '$15 overage per extra session',
    ],
  },
  {
    key: 'bamboo_pass',
    name: 'Bamboo Pass',
    price: '$49.99',
    period: '/mo',
    amountCents: 4999,
    border: 'border-t-4 border-green-600',
    selectedBorder: 'border-2 border-green-600',
    btn: 'bg-green-600 text-white hover:bg-green-700',
    benefits: [
      '1 session per week',
      '$15 overage per extra session',
    ],
  },
  {
    key: 'four_winds_member',
    name: 'Four Winds Member',
    price: 'Free',
    period: '',
    amountCents: 0,
    border: 'border-t-4 border-navy',
    selectedBorder: 'border-2 border-navy',
    btn: 'bg-white text-navy border border-navy hover:bg-sky-pale',
    benefits: [
      '$15 per session',
      'Reserve seats in advance',
      'No monthly commitment',
    ],
    note: 'Default if no plan selected',
  },
]

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEP_LABELS = { 1: 'Your Details', 2: 'Choose Your Plan', 3: 'Payment' }

function StepIndicator({ step, total = 2 }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      {Array.from({ length: total }, (_, i) => i + 1).map(n => (
        <div key={n} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-sans text-xs font-medium transition-all ${
            n === step ? 'bg-navy text-sky' : n < step ? 'bg-sky-mid text-navy' : 'bg-navy/10 text-text-soft'
          }`}>
            {n < step ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : n}
          </div>
          {n < total && <div className={`w-8 h-px ${step > n ? 'bg-sky-mid' : 'bg-navy/15'}`} />}
        </div>
      ))}
      <p className="font-sans text-xs text-text-soft ml-1">{STEP_LABELS[step] ?? ''}</p>
    </div>
  )
}

// ─── Eye icon ─────────────────────────────────────────────────────────────────
function EyeIcon({ open }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SignupPage() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  // Step 1 state
  const [step, setStep]               = useState(1)
  const [firstName, setFirstName]     = useState('')
  const [lastName, setLastName]       = useState('')
  const [email, setEmail]             = useState('')
  const [phone, setPhone]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPass, setShowPass]       = useState(false)
  const [step1Error, setStep1Error]   = useState(null)

  // Step 2 state
  const [selected, setSelected]       = useState('four_winds_member')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)

  // Step 3 Square card state
  const signupCardRef                 = useRef(null)
  const [signupCardReady, setSignupCardReady] = useState(false)
  const [signupCardError, setSignupCardError] = useState(null)

  const inputCls = 'w-full bg-white border border-navy/20 rounded-full px-5 py-3 text-base font-sans text-navy placeholder:text-text-soft focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy/40 transition-all'

  // ── Square SDK init for Step 3 ─────────────────────────────────────────────
  useEffect(() => {
    if (step !== 3) return

    const APP_ID      = import.meta.env.VITE_SQUARE_APP_ID
    const LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID

    if (!APP_ID || !LOCATION_ID) {
      setSignupCardError('Square is not configured. Add VITE_SQUARE_APP_ID and VITE_SQUARE_LOCATION_ID to .env')
      return
    }

    let card = null
    let cancelled = false

    async function init() {
      try {
        const { payments } = await import('@square/web-sdk')
        const paymentsInstance = await payments(APP_ID, LOCATION_ID)
        card = await paymentsInstance.card()
        await card.attach('#square-card-signup')
        if (!cancelled) {
          signupCardRef.current = card
          setSignupCardReady(true)
        }
      } catch (err) {
        if (!cancelled) {
          setSignupCardError(err?.message ?? 'Failed to load payment form')
        }
      }
    }

    init()

    return () => {
      cancelled = true
      card?.destroy?.()
      signupCardRef.current = null
      setSignupCardReady(false)
      setSignupCardError(null)
    }
  }, [step])

  // ── Step 1 validation ──────────────────────────────────────────────────────
  function handleContinue(e) {
    e.preventDefault()
    setStep1Error(null)
    if (!firstName.trim() || !lastName.trim()) {
      setStep1Error('Please enter your first and last name.')
      return
    }
    if (password.length < 8) {
      setStep1Error('Password must be at least 8 characters.')
      return
    }
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const isPaidPlan = PLANS.find(p => p.key === selected)?.amountCents > 0

  // ── Step 2 → advance ──────────────────────────────────────────────────────
  function handlePlanContinue() {
    if (isPaidPlan) {
      setStep(3)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      handleCreate()
    }
  }

  // ── Free-plan account creation ─────────────────────────────────────────────
  async function handleCreate() {
    setLoading(true)
    setError(null)
    const fullName = `${firstName.trim()} ${lastName.trim()}`
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim(),
          },
        },
      })

      if (authError) { setError(authError.message); return }

      if (data?.user) {
        await supabase
          .from('profiles')
          .upsert(
            {
              id: data.user.id,
              full_name: fullName,
              email,
              phone: phone.trim(),
              role: 'customer',
              membership_type: selected,
              is_active: true,
            },
            { onConflict: 'id' }
          )

        await new Promise(r => setTimeout(r, 500))

        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ full_name: fullName, phone: phone.trim(), membership_type: selected })
          .eq('id', data.user.id)
        if (updateErr) console.error('[Signup] profile update error:', updateErr.message)
      }

      navigate('/dashboard', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  // ── Paid-plan: signup + save card + charge ─────────────────────────────────
  async function handleSignupAndPay(e) {
    e.preventDefault()
    if (!signupCardRef.current || loading) return
    setLoading(true)
    setError(null)

    try {
      // 1. Tokenize card
      const result = await signupCardRef.current.tokenize()
      if (result.status !== 'OK') {
        setError(result.errors?.[0]?.message ?? 'Card validation failed')
        return
      }
      const token = result.token

      // 2. Create auth account
      const fullName = `${firstName.trim()} ${lastName.trim()}`
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim(),
          },
        },
      })
      if (authError) { setError(authError.message); return }

      const userId = data?.user?.id
      if (!userId) { setError('Account creation failed. Please try again.'); return }

      // 3. Upsert profile with chosen plan
      const { error: upsertError } = await supabase.from('profiles').upsert(
        { id: userId, full_name: fullName, email, phone: phone.trim(), role: 'customer', membership_type: selected, is_active: true },
        { onConflict: 'id' }
      )
      if (upsertError) console.error('[Signup] profile upsert error:', upsertError.message)
      const { error: profileUpdateErr } = await supabase.from('profiles').update({ full_name: fullName, phone: phone.trim(), membership_type: selected }).eq('id', userId)
      if (profileUpdateErr) console.error('[Signup] profile update error:', profileUpdateErr.message)

      // 4. Vault card via save-card Edge Function — delay lets Supabase replicate the upsert
      await new Promise(r => setTimeout(r, 500))
      await saveCard({ userId, token, email, displayName: fullName })

      // 5. Fetch fresh profile — square_customer_id / square_card_id written by Edge Function
      const { data: freshProfile } = await supabase
        .from('profiles')
        .select('square_customer_id, square_card_id')
        .eq('id', userId)
        .single()

      if (!freshProfile?.square_customer_id || !freshProfile?.square_card_id) {
        console.warn('[Signup] square_customer_id or square_card_id missing after save-card')
        setError('Account created! Card could not be saved — you can add it from your profile.')
        setTimeout(() => navigate('/sessions', { replace: true }), 2000)
        return
      }

      // 6. Charge saved card for first month
      console.log('[Signup] charging for membership:', selected, 'userId:', userId)
      await chargeCardOnFile({
        userId,
        squareCustomerId: freshProfile.square_customer_id,
        cardId: freshProfile.square_card_id,
        amountCents: selectedPlan.amountCents,
        description: `Four Winds ${selectedPlan.name} — first month`,
        membershipType: selected,
        paymentType: 'membership',
      })

      // 7. Sync profile state in AuthContext
      // Wait for Edge Function to finish writing membership_type to profile
      await new Promise(r => setTimeout(r, 2000))
      await refreshProfile()
      navigate('/sessions', { replace: true })
    } catch (err) {
      setError(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selectedPlan = PLANS.find(p => p.key === selected)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-navy relative flex items-center justify-center px-4 py-12 overflow-hidden">
      <FloatingTiles />

      <div className="relative z-10 w-full max-w-2xl">

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="bg-warm-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <h1 className="font-playfair text-3xl text-navy">
                Join Four <em className="text-sky-mid">Winds</em>
              </h1>
              <p className="font-cormorant italic text-text-mid text-lg mt-1">
                Create your member account
              </p>
            </div>

            <StepIndicator step={1} />

            {step1Error && <Alert type="error" className="mb-5">{step1Error}</Alert>}

            <form onSubmit={handleContinue} className="space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-sm font-medium text-text-mid mb-1.5">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                    placeholder="Jane"
                    className={inputCls}
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <div>
                  <label className="block font-sans text-sm font-medium text-text-mid mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                    autoComplete="family-name"
                    placeholder="Smith"
                    className={inputCls}
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block font-sans text-sm font-medium text-text-mid mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="jane@example.com"
                  className={inputCls}
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block font-sans text-sm font-medium text-text-mid mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  placeholder="(555) 555-5555"
                  className={inputCls}
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* Password with show/hide */}
              <div>
                <label className="block font-sans text-sm font-medium text-text-mid mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className={`${inputCls} pr-12`}
                    style={{ fontSize: '16px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-soft hover:text-navy transition-colors"
                    tabIndex={-1}
                  >
                    <EyeIcon open={showPass} />
                  </button>
                </div>
                {password.length > 0 && password.length < 8 && (
                  <p className="font-sans text-xs text-red-500 mt-1.5 ml-2">
                    {8 - password.length} more character{8 - password.length !== 1 ? 's' : ''} needed
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-navy text-sky rounded-full py-3.5 font-sans font-medium text-base hover:bg-navy-deep transition-all duration-200 mt-2 flex items-center justify-center gap-2"
              >
                Continue
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </form>

            <p className="text-center font-sans text-sm text-text-soft mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-sky-mid hover:text-navy font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Header card */}
            <div className="bg-navy rounded-2xl px-8 py-7 text-center shadow-2xl">
              <StepIndicator step={2} total={isPaidPlan ? 3 : 2} />
              <h2 className="font-playfair text-sky text-3xl mb-2">Choose Your Plan</h2>
              <p className="font-cormorant italic text-sky/60 text-lg">
                You can upgrade or change anytime from your profile.
              </p>
            </div>

            {error && <Alert type="error">{error}</Alert>}

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLANS.map(plan => {
                const isSelected = selected === plan.key
                return (
                  <button
                    key={plan.key}
                    onClick={() => setSelected(plan.key)}
                    className={`relative bg-white rounded-2xl p-6 text-left shadow-sm transition-all duration-200 ${
                      plan.border
                    } ${
                      isSelected
                        ? `${plan.selectedBorder} scale-105 shadow-lg`
                        : 'border border-navy/8 hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Checkmark */}
                    {isSelected && (
                      <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-navy flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-sky" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    <p className="font-playfair text-navy text-xl mb-1">{plan.name}</p>
                    <p className="font-playfair text-navy mb-4">
                      <span className="text-3xl">{plan.price}</span>
                      <span className="text-base text-text-soft font-sans">{plan.period}</span>
                    </p>

                    <ul className="space-y-2 mb-4">
                      {plan.benefits.map(b => (
                        <li key={b} className="flex items-start gap-2 font-cormorant text-text-mid text-base leading-snug">
                          <span className="text-gold mt-0.5 flex-shrink-0">✦</span>
                          {b}
                        </li>
                      ))}
                    </ul>

                    {plan.note && (
                      <p className="font-sans text-[11px] text-text-soft mt-1">{plan.note}</p>
                    )}
                  </button>
                )
              })}
            </div>


            {/* Create account / continue button */}
            <button
              onClick={handlePlanContinue}
              disabled={loading}
              className="w-full bg-navy text-sky rounded-full py-4 font-sans font-medium text-base hover:bg-navy-deep transition-all duration-200 disabled:opacity-50 shadow-lg"
            >
              {loading
                ? 'Creating your account…'
                : isPaidPlan
                  ? `Continue to Payment — ${selectedPlan?.name}`
                  : `Create Account — ${selectedPlan?.name}`}
            </button>

            {/* Back */}
            <p className="text-center">
              <button
                onClick={() => setStep(1)}
                className="font-sans text-sm text-text-soft hover:text-navy transition-colors"
              >
                ← Back to your details
              </button>
            </p>
          </div>
        )}

        {/* ── STEP 3 — Payment ── */}
        {step === 3 && selectedPlan && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-navy rounded-2xl px-8 py-7 text-center shadow-2xl">
              <StepIndicator step={3} total={3} />
              <h2 className="font-playfair text-sky text-3xl mb-2">Payment</h2>
              <p className="font-cormorant italic text-sky/60 text-lg">
                Secure card payment via Square
              </p>
            </div>

            {/* Plan summary */}
            <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-playfair text-navy text-xl">{selectedPlan.name}</p>
                  <p className="font-cormorant italic text-text-soft text-base">First month</p>
                </div>
                <p className="font-playfair text-navy text-2xl">{selectedPlan.price}</p>
              </div>
            </div>

            {error && <Alert type="error">{error}</Alert>}

            <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-6">
              <form onSubmit={handleSignupAndPay} className="space-y-5">
                <div>
                  <label className="block font-sans text-xs uppercase tracking-[3px] text-sky-mid mb-2">
                    Card Details
                  </label>
                  <div
                    id="square-card-signup"
                    className="min-h-[44px] rounded-xl border border-navy/20 bg-white px-1 py-1"
                  />
                  {!signupCardReady && !signupCardError && (
                    <p className="font-sans text-xs text-text-soft mt-2">Loading card field…</p>
                  )}
                  {signupCardError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-2">
                      <p className="font-sans text-sm text-red-700">{signupCardError}</p>
                    </div>
                  )}
                </div>

                {import.meta.env.DEV && (
                  <p className="font-sans text-[11px] text-text-soft text-center">
                    Sandbox — use card <span className="font-mono">4111 1111 1111 1111</span>, any future date, any CVV
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!signupCardReady || loading || !!signupCardError}
                  className="w-full bg-navy text-sky rounded-full py-3.5 font-sans font-medium text-base hover:bg-navy-deep transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing…' : `Pay ${selectedPlan.price} & Create Account`}
                </button>
              </form>
            </div>

            <p className="text-center">
              <button
                onClick={() => setStep(2)}
                className="font-sans text-sm text-text-soft hover:text-navy transition-colors"
              >
                ← Back to plan selection
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
