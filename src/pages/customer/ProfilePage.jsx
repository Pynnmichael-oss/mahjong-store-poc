import { useEffect, useRef, useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import CustomerHeader from '../../components/layout/CustomerHeader.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useBuddyPass } from '../../hooks/useBuddyPass.js'
import { supabase } from '../../services/supabase.js'
import { saveCard } from '../../services/cardService.js'
import { changeSubscription, cancelSubscription, getPlanVariationId } from '../../services/subscriptionService.js'
import { checkCancellationEligibility, cancelReservationWithRefund } from '../../services/reservationService.js'
import { getMembershipConfig, getMembershipBadgeClasses, isBuddyPassEligible, getPassResetDate, getWeeklyLimit, getTableForSeat, BUDDY_PASS_ENABLED } from '../../lib/businessRules.js'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'
import { useWeeklySessionCount } from '../../hooks/useMonthlySessionCount.js'
import Alert from '../../components/ui/Alert.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'

const APP_ID      = import.meta.env.VITE_SQUARE_APP_ID
const LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID

const UPGRADE_PLANS = [
  {
    key: 'dragon_pass',
    name: 'Dragon Pass',
    price: '$149.99',
    amountCents: 14999,
    border: 'border-t-4 border-gold',
    selectedRing: 'ring-2 ring-gold',
    tagCls: 'bg-gold/10 text-navy border border-gold/30',
  },
  {
    key: 'flower_pass',
    name: 'Flower Pass',
    price: '$79.99',
    amountCents: 7999,
    border: 'border-t-4 border-sky-mid',
    selectedRing: 'ring-2 ring-sky-mid',
    tagCls: 'bg-sky-light text-navy border border-sky-mid/30',
  },
  {
    key: 'bamboo_pass',
    name: 'Bamboo Pass',
    price: '$49.99',
    amountCents: 4999,
    border: 'border-t-4 border-green-600',
    selectedRing: 'ring-2 ring-green-600',
    tagCls: 'bg-green-50 text-green-800 border border-green-200',
  },
  {
    key: 'four_winds_member',
    name: 'Four Winds Member',
    price: 'Free',
    amountCents: 0,
    border: 'border-t-4 border-navy',
    selectedRing: 'ring-2 ring-navy',
    tagCls: 'bg-sky-light text-navy border border-navy/20',
  },
]

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const { pass: buddyPass, loading: passLoading, error: passError } = useBuddyPass()
  const [copied, setCopied] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(buddyPass?.code ?? '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function shareCode() {
    const text = `Use my Four Winds buddy pass code to book a free walk-in session: ${buddyPass?.code}`
    if (navigator.share) {
      navigator.share({ title: 'Four Winds Buddy Pass', text }).catch(() => {})
    } else {
      copyCode()
    }
  }

  const [editName, setEditName] = useState(profile?.full_name ?? '')
  const [nameChanged, setNameChanged] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradePlan, setUpgradePlan] = useState(null)       // selected plan key in modal
  const [upgradeStep, setUpgradeStep] = useState('choose')   // 'choose' | 'pay'
  const [upgradeError, setUpgradeError] = useState(null)
  const [upgradeSuccess, setUpgradeSuccess] = useState(false)

  // ── Card management ────────────────────────────────────────────────────────
  const [showCardModal, setShowCardModal] = useState(false)
  const [cardSaving,    setCardSaving]    = useState(false)
  const [cardModalError, setCardModalError] = useState(null)
  const [savedCardDisplay, setSavedCardDisplay] = useState(null) // { cardLast4, cardBrand } after save
  const cardFieldRef = useRef(null)
  const [cardFieldReady, setCardFieldReady] = useState(false)
  const [cardFieldError, setCardFieldError] = useState(null)

  const [reservations,  setReservations]  = useState([])
  const [resLoading,    setResLoading]    = useState(true)
  const [cancellingId,  setCancellingId]  = useState(null)
  const [cancelModal,   setCancelModal]   = useState(null) // { reservation, eligibility }
  const [cancelError,   setCancelError]   = useState(null)
  const [cancelSuccess, setCancelSuccess] = useState(false)

  function openUpgradeModal() {
    setUpgradePlan(null)
    setUpgradeStep('choose')
    setUpgradeError(null)
    setUpgradeSuccess(false)
    setShowUpgradeModal(true)
  }

  async function handleFreePlanChange() {
    setUpgradeError(null)
    try {
      // Schedule cancellation at period end — keeps access until next billing date
      if (profile?.subscription_id) {
        await cancelSubscription({ subscriptionId: profile.subscription_id })
      }
      // Do NOT change membership_type here — webhook will set it to four_winds_member
      // at period end when Square fires subscription.canceled.
      // Show success message with the date their access ends.
      setUpgradeSuccess(true)
      setTimeout(() => { setShowUpgradeModal(false); window.location.reload() }, 2500)
    } catch (err) {
      setUpgradeError(err.message ?? 'Plan change failed')
    }
  }

  async function handleConfirmPaidChange() {
    setUpgradeError(null)
    const newPlanVariationId = getPlanVariationId(upgradePlan)
    if (!newPlanVariationId) {
      setUpgradeError('Invalid plan selection')
      return
    }

    // Always re-fetch profile from DB so any recently saved card is picked up
    const { data: freshProfile } = await supabase
      .from('profiles')
      .select('subscription_id, square_customer_id, square_card_id, full_name')
      .eq('id', user.id)
      .single()

    if (!freshProfile?.square_card_id || !freshProfile?.square_customer_id) {
      setUpgradeError('Please add a payment method first. Use the "Add card" link in your profile, then try again.')
      return
    }

    try {
      await changeSubscription({
        userId:             user.id,
        oldSubscriptionId:  freshProfile.subscription_id ?? null,
        newPlanVariationId,
        newMembershipType:  upgradePlan,
        squareCustomerId:   freshProfile.square_customer_id,
        squareCardId:       freshProfile.square_card_id,
        email:              user.email,
        displayName:        freshProfile.full_name ?? user.email,
      })
      setUpgradeSuccess(true)
      setTimeout(() => { setShowUpgradeModal(false); window.location.reload() }, 2000)
    } catch (err) {
      setUpgradeError(err.message ?? 'Plan change failed')
    }
  }

  function handleNameChange(e) {
    setEditName(e.target.value)
    setNameChanged(e.target.value !== profile?.full_name)
  }

  async function handleSaveName() {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ full_name: editName }).eq('id', user.id)
    setSaving(false)
    if (error) {
      setSaveMsg({ type: 'error', text: error.message })
    } else {
      setSaveMsg({ type: 'success', text: 'Name updated!' })
      setNameChanged(false)
    }
    setTimeout(() => setSaveMsg(null), 3000)
  }

  // ── Square init for card modal ─────────────────────────────────────────────
  useEffect(() => {
    if (!showCardModal) return

    let card = null
    let cancelled = false

    async function initSquare() {
      if (!APP_ID || !LOCATION_ID) {
        setCardFieldError('Square not configured')
        return
      }
      try {
        const { payments } = await import('@square/web-sdk')
        const instance = await payments(APP_ID, LOCATION_ID)
        card = await instance.card()
        await card.attach('#profile-card-field')
        if (!cancelled) {
          cardFieldRef.current = card
          setCardFieldReady(true)
        }
      } catch (err) {
        if (!cancelled) setCardFieldError(err?.message ?? 'Failed to load card form')
      }
    }

    initSquare()

    return () => {
      cancelled = true
      card?.destroy?.()
      cardFieldRef.current = null
      setCardFieldReady(false)
      setCardFieldError(null)
    }
  }, [showCardModal]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveCard(e) {
    e.preventDefault()
    if (!cardFieldRef.current || !cardFieldReady || cardSaving) return
    setCardSaving(true)
    setCardModalError(null)
    try {
      const result = await cardFieldRef.current.tokenize()
      if (result.status !== 'OK') {
        throw new Error(result.errors?.[0]?.message ?? 'Card validation failed')
      }
      const saved = await saveCard({
        userId:      user.id,
        token:       result.token,
        email:       user.email,
        displayName: profile.full_name ?? user.email,
      })
      setSavedCardDisplay({ cardLast4: saved.cardLast4, cardBrand: saved.cardBrand })
      setShowCardModal(false)
    } catch (err) {
      setCardModalError(err.message ?? 'Failed to save card')
    } finally {
      setCardSaving(false)
    }
  }

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('reservations')
      .select('*, sessions(*), seats(*)')
      .eq('user_id', user.id)
      .in('status', ['confirmed'])
      .order('reserved_at', { ascending: false })
      .then(({ data }) => {
        const upcoming = (data ?? []).filter(r => {
          if (!r.sessions?.date) return false
          const sessionDate = new Date(r.sessions.date + 'T23:59:59')
          return sessionDate >= new Date()
        })
        setReservations(upcoming)
        setResLoading(false)
      })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCancelClick(reservation) {
    setCancelError(null)
    setCancellingId(reservation.id)
    try {
      const eligibility = await checkCancellationEligibility(reservation.id, user.id)
      setCancelModal({ reservation, eligibility })
    } catch (err) {
      setCancelError(err.message)
    } finally {
      setCancellingId(null)
    }
  }

  async function handleConfirmCancel() {
    if (!cancelModal) return
    setCancellingId(cancelModal.reservation.id)
    setCancelError(null)
    try {
      await cancelReservationWithRefund(cancelModal.reservation.id, user.id, false)
      setCancelSuccess(true)
      setCancelModal(null)
      setReservations(prev => prev.filter(r => r.id !== cancelModal.reservation.id))
      setTimeout(() => setCancelSuccess(false), 3000)
    } catch (err) {
      setCancelError(err.message)
    } finally {
      setCancellingId(null)
    }
  }

  const membershipType = profile?.membership_type ?? 'four_winds_member'
  const config = getMembershipConfig(membershipType)
  const { weeklyCount } = useWeeklySessionCount()
  const isDragonPass = membershipType === 'dragon_pass'
  const isFlowerPass = membershipType === 'flower_pass'
  const isBambooPass = membershipType === 'bamboo_pass'
  const weeklyLimit  = getWeeklyLimit(membershipType)
  const weeklyPct    = weeklyLimit ? Math.min((weeklyCount / weeklyLimit) * 100, 100) : 0

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'

  return (
    <PageWrapper noPad>
      <CustomerHeader />
      {/* Navy hero */}
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Account</p>
          <h1 className="font-playfair text-3xl text-sky">{profile?.full_name ?? 'My Profile'}</h1>
          <p className="font-cormorant italic text-sky/60 mt-1">{config.description}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* Name */}
        <FadeUp>
          <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-6">
            <label className="block font-sans text-xs uppercase tracking-[3px] text-sky-mid mb-3">Full Name</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={editName}
                onChange={handleNameChange}
                className="flex-1 border-0 border-b border-navy/20 bg-transparent pb-1 font-playfair text-xl text-navy focus:outline-none focus:border-navy transition-colors"
                style={{ fontSize: '20px' }}
              />
              {nameChanged && (
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-full font-sans text-xs font-medium bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
            {saveMsg && <Alert type={saveMsg.type} className="mt-3">{saveMsg.text}</Alert>}
          </div>
        </FadeUp>

        {/* Email */}
        <FadeUp delay={50}>
          <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-6">
            <label className="block font-sans text-xs uppercase tracking-[3px] text-sky-mid mb-3">Email</label>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-text-soft flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="font-sans text-text-mid text-sm">{profile?.email ?? user?.email ?? '—'}</p>
            </div>
          </div>
        </FadeUp>

        {/* Phone */}
        <FadeUp delay={75}>
          <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-6">
            <label className="block font-sans text-xs uppercase tracking-[3px] text-sky-mid mb-3">Phone</label>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-text-soft flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <p className="font-sans text-text-mid text-sm">{profile?.phone ?? 'Not provided'}</p>
            </div>
          </div>
        </FadeUp>

        {/* Membership */}
        <FadeUp delay={100}>
          <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-6">
            <label className="block font-sans text-xs uppercase tracking-[3px] text-sky-mid mb-3">Membership</label>
            <div className="flex items-center gap-3 mb-1">
              <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-sans text-xs font-medium ${getMembershipBadgeClasses(membershipType)}`}>
                {membershipType === 'founding_member' && (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z"/>
                  </svg>
                )}
                {config.label}
              </span>
            </div>
            {config.price && (
              <p className="font-cormorant italic text-text-soft text-sm mb-3">{config.price}</p>
            )}

            {/* Dragon Pass feature pills */}
            {isDragonPass && (
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  ...(BUDDY_PASS_ENABLED ? ['🎟 2 Buddy Passes / Month'] : []),
                  '⚡ Early Event Access',
                  '15% Event Discount',
                ].map(label => (
                  <span key={label} className="inline-flex items-center px-3 py-1 rounded-full font-sans text-xs bg-gold-light text-navy border border-gold/30">
                    {label}
                  </span>
                ))}
              </div>
            )}

            <p className="font-cormorant italic text-text-mid text-base">Member since {memberSince}</p>

            <button
              onClick={openUpgradeModal}
              className="mt-3 font-sans text-xs text-sky-mid hover:text-navy transition-colors"
            >
              Change Plan →
            </button>
          </div>
        </FadeUp>

        {/* Session usage */}
        <FadeUp delay={150}>
          <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-6">
            <label className="block font-sans text-xs uppercase tracking-[3px] text-sky-mid mb-4">
              {(isFlowerPass || isBambooPass) ? 'Sessions This Week' : 'Sessions'}
            </label>

            {(isFlowerPass || isBambooPass) && weeklyLimit && (
              <>
                <div className="flex justify-between font-sans text-sm mb-2">
                  <span className="text-text-mid">{weeklyCount} of {weeklyLimit} used</span>
                  <span className={weeklyCount >= weeklyLimit ? 'text-gold font-medium' : 'text-sky-mid font-medium'}>
                    {weeklyCount >= weeklyLimit ? 'Limit reached' : `${weeklyLimit - weeklyCount} remaining`}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-sky-light rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${weeklyCount >= weeklyLimit ? 'bg-gold' : 'bg-sky-mid'}`}
                    style={{ width: `${weeklyPct}%` }} />
                </div>
                {weeklyCount >= weeklyLimit && (
                  <p className="font-cormorant italic text-navy text-base mt-4 leading-relaxed bg-gold-light rounded-xl px-4 py-3">
                    You've used your {weeklyLimit === 1 ? 'session' : `${weeklyLimit} sessions`} this week. A $15 overage fee applies.
                  </p>
                )}
              </>
            )}

            {isDragonPass && (
              <p className="font-cormorant italic text-sky-mid text-lg">Unlimited plays — no restrictions.</p>
            )}

            {!isFlowerPass && !isBambooPass && !isDragonPass && (
              <p className="font-cormorant italic text-text-mid text-lg">$15 per session at booking.</p>
            )}
          </div>
        </FadeUp>

        {/* Payment method */}
        <FadeUp delay={175}>
          <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-6">
            <label className="block font-sans text-xs uppercase tracking-[3px] text-sky-mid mb-4">Payment Method</label>
            {profile?.square_card_id || savedCardDisplay ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-7 bg-sky-light rounded border border-navy/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-navy/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z" />
                    </svg>
                  </div>
                  <span className="font-sans text-sm text-navy">
                    {savedCardDisplay
                      ? `${savedCardDisplay.cardBrand} ···· ${savedCardDisplay.cardLast4}`
                      : 'Card on file'}
                  </span>
                </div>
                <button
                  onClick={() => { setShowCardModal(true); setCardModalError(null) }}
                  className="font-sans text-xs text-sky-mid hover:text-navy transition-colors"
                >
                  Update card →
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="font-cormorant italic text-text-soft text-base">No card saved</p>
                <button
                  onClick={() => { setShowCardModal(true); setCardModalError(null) }}
                  className="font-sans text-xs text-sky-mid hover:text-navy transition-colors"
                >
                  Add card →
                </button>
              </div>
            )}
          </div>
        </FadeUp>

        {/* Upcoming Reservations */}
        <FadeUp delay={200}>
          <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-6">
            <label className="block font-sans text-xs uppercase tracking-[3px] text-sky-mid mb-4">
              Upcoming Reservations
            </label>
            {cancelSuccess && (
              <Alert type="success" className="mb-3">Reservation cancelled successfully.</Alert>
            )}
            {cancelError && (
              <Alert type="error" className="mb-3">{cancelError}</Alert>
            )}
            {resLoading ? (
              <LoadingSpinner />
            ) : reservations.length === 0 ? (
              <p className="font-cormorant italic text-text-soft text-base">No upcoming reservations.</p>
            ) : (
              <div className="space-y-3">
                {reservations.map(r => {
                  const tableInfo = r.seats ? getTableForSeat(r.seats.seat_number) : null
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-4 py-2 border-b border-navy/5 last:border-0">
                      <div>
                        <p className="font-playfair text-navy text-sm">
                          {formatSessionDate(r.sessions?.date)}
                        </p>
                        <p className="font-sans text-xs text-text-soft mt-0.5">
                          {formatTime(r.sessions?.start_time)}
                          {tableInfo ? ` · ${tableInfo.tableName} · Seat ${r.seats.seat_number}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCancelClick(r)}
                        disabled={cancellingId === r.id}
                        className="font-sans text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                      >
                        {cancellingId === r.id ? 'Checking…' : 'Cancel'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </FadeUp>

        {/* Buddy Passes — dragon_pass eligible */}
        {BUDDY_PASS_ENABLED && isBuddyPassEligible(membershipType) && (
          <FadeUp delay={225}>
            <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-6">
              {passLoading ? (
                <div className="flex justify-center py-4"><LoadingSpinner /></div>
              ) : passError ? (
                <Alert type="error">{passError}</Alert>
              ) : buddyPass ? (() => {
                const used      = buddyPass.used_count ?? 0
                const max       = buddyPass.max_uses ?? 2
                const remaining = buddyPass.passes_remaining ?? (max - used)
                const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

                return (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                      <p className="font-sans text-sm font-medium text-navy">Buddy Passes</p>
                      <p className="font-sans text-sm text-text-soft">{monthLabel}</p>
                    </div>

                    {/* Pass circles */}
                    <div className="flex items-center justify-center gap-4 mb-3">
                      {Array.from({ length: max }).map((_, i) => {
                        const isUsed = i < used
                        return (
                          <div
                            key={i}
                            className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                              isUsed
                                ? 'bg-navy border-navy'
                                : 'bg-white border-navy'
                            }`}
                          >
                            {isUsed ? (
                              <svg className="w-7 h-7 text-sky" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="font-playfair text-navy text-xl">{i + 1 - used}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <p className="font-cormorant italic text-text-mid text-sm text-center mb-5">
                      {used} used · {remaining} remaining this month
                    </p>

                    {/* All used banner */}
                    {remaining === 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
                        <p className="font-cormorant italic text-red-700 text-sm text-center">
                          Both passes used this month. Resets on {getPassResetDate()}.
                        </p>
                      </div>
                    )}

                    {/* Code display */}
                    <div className="border border-dashed border-navy/20 rounded-xl p-4 bg-cream text-center">
                      <p className="font-sans text-[10px] uppercase tracking-[4px] text-text-soft mb-2">Your Pass Code</p>
                      <p className="font-playfair text-navy text-2xl tracking-widest mb-4">
                        {buddyPass.code}
                      </p>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={copyCode}
                          className="px-4 py-2 rounded-full font-sans text-xs font-medium border border-navy/20 text-navy hover:bg-sky-pale transition-all"
                        >
                          {copied ? 'Copied!' : 'Copy Code'}
                        </button>
                        <button
                          onClick={shareCode}
                          className="px-4 py-2 rounded-full font-sans text-xs font-medium text-text-soft border border-navy/10 hover:border-navy/20 hover:text-navy transition-all"
                        >
                          Share
                        </button>
                      </div>
                    </div>
                    <p className="font-cormorant italic text-text-soft text-xs text-center mt-3 leading-relaxed">
                      Share this code with a friend. They'll enter it when booking their walk-in session.
                    </p>
                  </>
                )
              })() : null}
            </div>
          </FadeUp>
        )}

      </div>

      {/* Card add/update modal */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => setShowCardModal(false)} />
          <div className="relative bg-warm-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-playfair text-navy text-2xl">
                {profile?.square_card_id ? 'Update Card' : 'Add Card'}
              </h2>
              <button
                onClick={() => setShowCardModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-sky-pale transition-colors"
              >
                <svg className="w-4 h-4 text-text-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-4">
              <div>
                <label className="block font-sans text-xs uppercase tracking-[3px] text-sky-mid mb-2">
                  Card Details
                </label>
                <div
                  id="profile-card-field"
                  className="min-h-[44px] rounded-xl border border-navy/20 bg-white px-1 py-1"
                />
                {!cardFieldReady && !cardFieldError && (
                  <p className="font-sans text-xs text-text-soft mt-1">Loading card field…</p>
                )}
                {cardFieldError && (
                  <p className="font-sans text-xs text-red-600 mt-1">{cardFieldError}</p>
                )}
              </div>

              {cardModalError && <Alert type="error">{cardModalError}</Alert>}

              {import.meta.env.DEV && (
                <p className="font-sans text-[11px] text-text-soft text-center">
                  Sandbox — use <span className="font-mono">4111 1111 1111 1111</span>, any future date, any CVV
                </p>
              )}

              <button
                type="submit"
                disabled={!cardFieldReady || cardSaving}
                className="w-full bg-navy text-sky rounded-full py-3 font-sans font-medium text-sm hover:bg-navy-deep transition-all disabled:opacity-50"
              >
                {cardSaving ? 'Saving…' : 'Save Card'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Change Plan modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => setShowUpgradeModal(false)} />
          <div className="relative bg-warm-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-playfair text-navy text-2xl">
                {upgradeStep === 'choose' ? 'Change Plan' : 'Payment'}
              </h2>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-sky-pale transition-colors"
              >
                <svg className="w-4 h-4 text-text-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {upgradeSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center space-y-1">
                <p className="font-sans text-sm text-green-700 font-medium">
                  {upgradePlan === 'four_winds_member'
                    ? 'Plan cancellation scheduled'
                    : 'Plan changed successfully!'}
                </p>
                {upgradePlan === 'four_winds_member' && (
                  <p className="font-cormorant italic text-green-700 text-base">
                    You'll keep your current benefits until your next billing date.
                  </p>
                )}
              </div>
            )}

            {!upgradeSuccess && upgradeStep === 'choose' && (
              <div className="space-y-3">
                {UPGRADE_PLANS.filter(p => p.key !== membershipType && p.key !== 'founding_member').map(plan => (
                  <button
                    key={plan.key}
                    onClick={() => setUpgradePlan(plan.key)}
                    className={`w-full text-left bg-white rounded-xl border p-4 transition-all ${
                      plan.border
                    } ${
                      upgradePlan === plan.key ? plan.selectedRing + ' shadow-md' : 'border-navy/8 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-playfair text-navy text-lg">{plan.name}</p>
                      <div className="flex items-center gap-2">
                        <span className={`font-sans text-sm px-2.5 py-0.5 rounded-full ${plan.tagCls}`}>
                          {plan.price}{plan.amountCents > 0 ? '/mo' : ''}
                        </span>
                        {upgradePlan === plan.key && (
                          <div className="w-5 h-5 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-sky" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}

                {upgradeError && <Alert type="error">{upgradeError}</Alert>}

                <button
                  onClick={() => {
                    if (!upgradePlan) return
                    const plan = UPGRADE_PLANS.find(p => p.key === upgradePlan)
                    if (plan?.amountCents > 0) {
                      setUpgradeStep('pay')
                    } else {
                      handleFreePlanChange()
                    }
                  }}
                  disabled={!upgradePlan}
                  className="w-full mt-2 bg-navy text-sky rounded-full py-3 font-sans font-medium text-sm hover:bg-navy-deep transition-all disabled:opacity-40"
                >
                  {(() => {
                    const plan = UPGRADE_PLANS.find(p => p.key === upgradePlan)
                    if (!plan) return 'Select a plan'
                    return plan.amountCents > 0
                      ? `Continue to Payment — ${plan.name}`
                      : `Switch to ${plan.name}`
                  })()}
                </button>
              </div>
            )}

            {!upgradeSuccess && upgradeStep === 'pay' && (() => {
              const plan = UPGRADE_PLANS.find(p => p.key === upgradePlan)
              return (
                <div className="space-y-4">
                  {/* Plan summary */}
                  <div className="bg-cream rounded-xl px-4 py-3 flex items-center justify-between">
                    <p className="font-playfair text-navy text-lg">{plan?.name}</p>
                    <p className="font-playfair text-navy text-xl">{plan?.price}<span className="font-sans text-text-soft text-sm">/mo</span></p>
                  </div>

                  <div className="bg-sky-light/40 border border-sky-mid/20 rounded-xl px-4 py-3">
                    <p className="font-cormorant italic text-navy text-base leading-relaxed">
                      Your current plan will be cancelled and the new plan will start immediately. Your card on file will be charged <span className="font-medium">{plan?.price}</span> today, then again every month on the same date.
                    </p>
                  </div>

                  {upgradeError && <Alert type="error">{upgradeError}</Alert>}

                  <button
                    onClick={handleConfirmPaidChange}
                    className="w-full bg-navy text-sky rounded-full py-3 font-sans font-medium text-sm hover:bg-navy-deep transition-all"
                  >
                    Confirm — Charge {plan?.price} &amp; Switch
                  </button>

                  <p className="text-center">
                    <button
                      onClick={() => setUpgradeStep('choose')}
                      className="font-sans text-xs text-text-soft hover:text-navy transition-colors"
                    >
                      ← Back
                    </button>
                  </p>
                </div>
              )
            })()}
          </div>
        </div>
      )}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => setCancelModal(null)} />
          <div className="relative bg-warm-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h2 className="font-playfair text-navy text-2xl">Cancel Reservation</h2>
            <p className="font-cormorant italic text-text-mid text-base">
              {formatSessionDate(cancelModal.reservation.sessions?.date)} at {formatTime(cancelModal.reservation.sessions?.start_time)}
            </p>
            {cancelModal.eligibility?.refundable ? (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="font-sans text-sm text-green-700 font-medium">
                  You'll receive a full refund of ${((cancelModal.eligibility.refund_amount ?? 0) / 100).toFixed(2)}.
                </p>
              </div>
            ) : cancelModal.eligibility?.within_window ? (
              <div className="bg-gold-light border border-gold/40 rounded-xl px-4 py-3">
                <p className="font-sans text-sm text-navy font-medium">No refund — within 24-hour window.</p>
                <p className="font-cormorant italic text-text-mid text-sm mt-1">Your seat will be released.</p>
              </div>
            ) : (
              <div className="bg-sky-light border border-sky/30 rounded-xl px-4 py-3">
                <p className="font-sans text-sm text-navy">Your seat will be released. No payment was taken.</p>
              </div>
            )}
            {cancelError && <Alert type="error">{cancelError}</Alert>}
            <div className="flex gap-3">
              <button
                onClick={() => setCancelModal(null)}
                className="flex-1 py-3 rounded-full font-sans text-sm font-medium border-[1.5px] border-navy text-navy hover:bg-sky-pale transition-all"
              >
                Keep Reservation
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={!!cancellingId}
                className="flex-1 py-3 rounded-full font-sans text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {cancellingId ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
