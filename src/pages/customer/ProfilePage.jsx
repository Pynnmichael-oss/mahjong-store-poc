import { useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useUserReservations } from '../../hooks/useReservations.js'
import { useWeeklyLimit } from '../../hooks/useWeeklyLimit.js'
import { useBuddyPass } from '../../hooks/useBuddyPass.js'
import { supabase } from '../../services/supabase.js'
import { getMembershipConfig, getMembershipBadgeClasses, isBuddyPassEligible, getPassResetDate } from '../../lib/businessRules.js'
import { useMonthlySessionCount } from '../../hooks/useMonthlySessionCount.js'
import Alert from '../../components/ui/Alert.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import SquarePaymentForm from '../../components/ui/SquarePaymentForm.jsx'

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
    price: '$89.99',
    amountCents: 8999,
    border: 'border-t-4 border-teal-500',
    selectedRing: 'ring-2 ring-teal-500',
    tagCls: 'bg-teal-50 text-teal-800 border border-teal-200',
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
  const { reservations } = useUserReservations(user?.id)
  const { checkedInCount, isOverLimit } = useWeeklyLimit(reservations, profile?.membership_type)
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

  function openUpgradeModal() {
    setUpgradePlan(null)
    setUpgradeStep('choose')
    setUpgradeError(null)
    setUpgradeSuccess(false)
    setShowUpgradeModal(true)
  }

  async function handleFreePlanChange() {
    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ membership_type: upgradePlan })
      .eq('id', user.id)
    if (dbErr) { setUpgradeError(dbErr.message); return }
    setUpgradeSuccess(true)
    setTimeout(() => { setShowUpgradeModal(false); window.location.reload() }, 1500)
  }

  function handleUpgradePaymentSuccess() {
    // Payment went through — update membership
    supabase.from('profiles').update({ membership_type: upgradePlan }).eq('id', user.id)
      .then(({ error: dbErr }) => {
        if (dbErr) { setUpgradeError(dbErr.message); return }
        setUpgradeSuccess(true)
        setTimeout(() => { setShowUpgradeModal(false); window.location.reload() }, 1500)
      })
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

  const membershipType = profile?.membership_type ?? 'walk_in'
  const config = getMembershipConfig(membershipType)
  const { monthlyCount } = useMonthlySessionCount()
  console.log('[Profile] membership:', profile?.membership_type, '→ resolved:', membershipType)
  console.log('[Profile] buddyEligible:', isBuddyPassEligible(membershipType), '| buddyPass:', buddyPass, '| passLoading:', passLoading)
  const isSubscriber = membershipType === 'subscriber'
  const isDragonPass = membershipType === 'dragon_pass'
  const isFlowerPass = membershipType === 'flower_pass'
  const playsMax = 3
  const progressPct = isSubscriber ? Math.min((checkedInCount / playsMax) * 100, 100) : 100
  const monthlyPct  = isFlowerPass ? Math.min((monthlyCount / 8) * 100, 100) : 0

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'

  return (
    <PageWrapper noPad>
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
              <span className={`inline-flex items-center px-4 py-1.5 rounded-full font-sans text-xs font-medium ${getMembershipBadgeClasses(membershipType)}`}>
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
                  '🎟 2 Buddy Passes / Month',
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
              {isFlowerPass ? 'This Month' : 'This Week'}
            </label>

            {isSubscriber && (
              <>
                <div className="flex justify-between font-sans text-sm mb-2">
                  <span className="text-text-mid">{checkedInCount} of {playsMax} plays used</span>
                  <span className={isOverLimit ? 'text-gold font-medium' : 'text-sky-mid font-medium'}>
                    {isOverLimit ? 'Limit reached' : `${playsMax - checkedInCount} remaining`}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-sky-pale rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${isOverLimit ? 'bg-gold' : 'bg-navy'}`}
                    style={{ width: `${progressPct}%` }} />
                </div>
                {isOverLimit && (
                  <p className="font-cormorant italic text-navy text-base mt-4 leading-relaxed bg-gold-light rounded-xl px-4 py-3">
                    You've reached your weekly limit. A walk-in fee applies at the door.
                  </p>
                )}
              </>
            )}

            {isFlowerPass && (
              <>
                <div className="flex justify-between font-sans text-sm mb-2">
                  <span className="text-text-mid">{monthlyCount} of 8 sessions used</span>
                  <span className={monthlyCount >= 8 ? 'text-gold font-medium' : 'text-teal-700 font-medium'}>
                    {monthlyCount >= 8 ? 'Limit reached' : `${8 - monthlyCount} remaining`}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-teal-50 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${monthlyCount >= 8 ? 'bg-gold' : 'bg-teal-500'}`}
                    style={{ width: `${monthlyPct}%` }} />
                </div>
                {monthlyCount >= 8 && (
                  <p className="font-cormorant italic text-navy text-base mt-4 leading-relaxed bg-gold-light rounded-xl px-4 py-3">
                    You've used all 8 sessions this month. Walk-in pricing applies at the door.
                  </p>
                )}
              </>
            )}

            {isDragonPass && (
              <p className="font-cormorant italic text-sky-mid text-lg">Unlimited plays — no restrictions.</p>
            )}

            {!isSubscriber && !isFlowerPass && !isDragonPass && (
              <p className="font-cormorant italic text-text-mid text-lg">Walk-in rates apply per session.</p>
            )}
          </div>
        </FadeUp>

        {/* Buddy Passes — dragon_pass eligible */}
        {isBuddyPassEligible(membershipType) && (
          <FadeUp delay={200}>
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
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
                <p className="font-sans text-sm text-green-700 font-medium">Plan updated! Refreshing…</p>
              </div>
            )}

            {!upgradeSuccess && upgradeStep === 'choose' && (
              <div className="space-y-3">
                {UPGRADE_PLANS.filter(p => p.key !== membershipType).map(plan => (
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

                  {upgradeError && <Alert type="error">{upgradeError}</Alert>}

                  <SquarePaymentForm
                    containerId="square-card-profile"
                    amountCents={plan?.amountCents ?? 0}
                    description={`Four Winds ${plan?.name} membership`}
                    userId={user?.id}
                    membershipType={upgradePlan}
                    onSuccess={handleUpgradePaymentSuccess}
                    onError={msg => setUpgradeError(msg)}
                    submitLabel={`Pay ${plan?.price}`}
                  />

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
    </PageWrapper>
  )
}
