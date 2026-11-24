import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { purchaseBlackFridaySpecial } from '../../services/promoService.js'
import { isBlackFridayPromoOpen, isEligibleForBlackFridayPromo, PROMO_BF_COPY } from '../../lib/promo.js'
import { formatMembershipExpiry } from '../../lib/dateUtils.js'
import Alert from './Alert.jsx'
import FadeUp from './FadeUp.jsx'

const APP_ID      = import.meta.env.VITE_SQUARE_APP_ID
const LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID
const CARD_CONTAINER_ID = 'bf-special-card-container'

/**
 * BlackFridaySpecialCard
 *
 * Self-gating promo card: renders nothing outside the promo window, or for a
 * member the server would reject anyway. The amount is never sent to the
 * server — purchase-bf-special holds the $357 constant.
 */
export default function BlackFridaySpecialCard() {
  const { user, profile } = useAuth()

  const [step, setStep]       = useState('offer')   // offer | pay | done
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState(null)
  const [result, setResult]   = useState(null)
  const [cardReady, setCardReady] = useState(false)

  const cardRef = useRef(null)
  const lockRef = useRef(false)   // ref, not state: guards against a double-tap
                                  // landing before React re-renders the button

  const savedCard = Boolean(profile?.square_card_id && profile?.square_customer_id)

  // Square card field — only mounted once the member opens the pay step with no
  // card on file.
  useEffect(() => {
    if (step !== 'pay' || savedCard) return

    if (!APP_ID || !LOCATION_ID) {
      setError('Card payments are not configured. Please contact staff.')
      return
    }

    let card = null
    let cancelled = false

    async function init() {
      try {
        const { payments } = await import('@square/web-sdk')
        const paymentsInstance = await payments(APP_ID, LOCATION_ID)
        card = await paymentsInstance.card()
        await card.attach(`#${CARD_CONTAINER_ID}`)
        if (!cancelled) {
          cardRef.current = card
          setCardReady(true)
        }
      } catch (err) {
        if (!cancelled) setError(err?.message ?? 'Failed to load the card form')
      }
    }

    init()

    return () => {
      cancelled = true
      card?.destroy?.()
      cardRef.current = null
      setCardReady(false)
    }
  }, [step, savedCard])

  async function handleBuy() {
    if (lockRef.current) return
    lockRef.current = true
    setBusy(true)
    setError(null)

    try {
      let token

      if (!savedCard) {
        if (!cardRef.current) throw new Error('The card form is still loading. Please try again.')
        const tokenised = await cardRef.current.tokenize()
        if (tokenised.status !== 'OK') {
          throw new Error(tokenised.errors?.[0]?.message ?? 'Please check your card details.')
        }
        token = tokenised.token
      }

      const data = await purchaseBlackFridaySpecial(token ? { token } : {})
      setResult(data)
      setStep('done')
    } catch (err) {
      setError(err?.message ?? 'Purchase failed')
    } finally {
      // Released only after the request settles, so the button stays disabled
      // for the whole round trip.
      lockRef.current = false
      setBusy(false)
    }
  }

  if (!isBlackFridayPromoOpen()) return null
  if (step !== 'done' && !isEligibleForBlackFridayPromo(profile)) return null
  if (!user) return null

  return (
    <FadeUp>
      <div className="bg-navy rounded-2xl border border-gold/40 shadow-sm overflow-hidden">
        <div className="bg-gold/15 border-b border-gold/30 px-6 py-2.5">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-gold text-center">
            One Day Only
          </p>
        </div>

        <div className="p-6">
          {step === 'done' ? (
            <div className="space-y-2 text-center">
              <h3 className="font-playfair text-sky text-2xl">You&rsquo;re all set</h3>
              <p className="font-cormorant italic text-sky/80 text-base leading-relaxed">
                Dragon Pass is active through{' '}
                {formatMembershipExpiry(result?.membershipExpiresAt)}. This does not auto-renew,
                so there is nothing to cancel.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-6 py-2.5 rounded-full font-sans text-sm font-medium bg-sky text-navy hover:bg-sky-light transition-all"
              >
                Refresh my membership
              </button>
            </div>
          ) : (
            <>
              <h3 className="font-playfair text-sky text-2xl mb-1">Black Friday Special</h3>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="font-playfair text-gold text-4xl">$357</span>
                <span className="font-sans text-sky/60 text-sm">paid once</span>
              </div>
              <p className="font-cormorant italic text-sky/80 text-base leading-relaxed mb-5">
                {PROMO_BF_COPY}
              </p>

              {error && <Alert type="error" className="mb-4">{error}</Alert>}

              {step === 'offer' && (
                <button
                  onClick={() => { setError(null); setStep('pay') }}
                  className="w-full py-3.5 rounded-full font-sans font-medium text-base bg-sky text-navy hover:bg-sky-light transition-all"
                >
                  Buy the Black Friday Special
                </button>
              )}

              {step === 'pay' && (
                <div className="space-y-4">
                  {savedCard ? (
                    <p className="font-sans text-sm text-sky/70">
                      Your card on file will be charged $357 once.
                    </p>
                  ) : (
                    <div>
                      <label className="block font-sans text-xs uppercase tracking-[3px] text-sky-mid mb-2">
                        Card Details
                      </label>
                      <div
                        id={CARD_CONTAINER_ID}
                        className="min-h-[44px] rounded-xl border border-sky/30 bg-white px-1 py-1"
                      />
                      {!cardReady && !error && (
                        <p className="font-sans text-xs text-sky/60 mt-2">Loading card field&hellip;</p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleBuy}
                    disabled={busy || (!savedCard && !cardReady)}
                    className="w-full py-3.5 rounded-full font-sans font-medium text-base bg-sky text-navy hover:bg-sky-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy ? 'Processing…' : 'Pay $357 once'}
                  </button>

                  {!busy && (
                    <p className="text-center">
                      <button
                        onClick={() => { setError(null); setStep('offer') }}
                        className="font-sans text-xs text-sky/60 hover:text-sky transition-colors"
                      >
                        &larr; Back
                      </button>
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </FadeUp>
  )
}
