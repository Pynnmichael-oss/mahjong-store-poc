import { useEffect, useRef, useState } from 'react'
import { chargeCard } from '../../services/paymentService.js'

const APP_ID       = import.meta.env.VITE_SQUARE_APP_ID
const LOCATION_ID  = import.meta.env.VITE_SQUARE_LOCATION_ID

/**
 * SquarePaymentForm
 *
 * Renders a Square card field and handles the full tokenize → charge flow.
 *
 * Props:
 *   amountCents     {number}   Amount in cents
 *   description     {string}   Payment description
 *   userId          {string}   Supabase user ID
 *   reservationId   {string}   Optional reservation ID
 *   membershipType  {string}   Optional membership type
 *   onSuccess       {(paymentId: string) => void}
 *   onError         {(msg: string) => void}
 *   submitLabel     {string}   Button text (default: "Pay Now")
 *   disabled        {boolean}
 */
export default function SquarePaymentForm({
  amountCents,
  description,
  userId,
  reservationId,
  membershipType,
  onSuccess,
  onError,
  submitLabel = 'Pay Now',
  disabled = false,
}) {
  const cardRef       = useRef(null)   // Square card instance
  const containerId   = useRef(`sq-card-${Math.random().toString(36).slice(2)}`)
  const [ready, setReady]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState(null)

  useEffect(() => {
    if (!APP_ID || !LOCATION_ID) {
      setLocalError('Square is not configured. Add VITE_SQUARE_APP_ID and VITE_SQUARE_LOCATION_ID to .env')
      return
    }

    let cancelled = false

    async function init() {
      try {
        // Dynamic import so the SDK doesn't break SSR / tests
        const { payments } = await import('@square/web-sdk')
        const paymentsInstance = await payments(APP_ID, LOCATION_ID)
        const card = await paymentsInstance.card()
        await card.attach(`#${containerId.current}`)

        if (!cancelled) {
          cardRef.current = card
          setReady(true)
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err?.message ?? 'Failed to load payment form'
          setLocalError(msg)
          onError?.(msg)
        }
      }
    }

    init()

    return () => {
      cancelled = true
      cardRef.current?.destroy?.()
      cardRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e) {
    e.preventDefault()
    if (!cardRef.current || loading || disabled) return

    setLoading(true)
    setLocalError(null)

    try {
      const result = await cardRef.current.tokenize()

      if (result.status !== 'OK') {
        const msg = result.errors?.[0]?.message ?? 'Card validation failed'
        setLocalError(msg)
        onError?.(msg)
        setLoading(false)
        return
      }

      const { paymentId } = await chargeCard({
        sourceId: result.token,
        amountCents,
        description,
        userId,
        reservationId,
        membershipType,
      })

      onSuccess?.(paymentId)
    } catch (err) {
      const msg = err?.message ?? 'Payment failed'
      setLocalError(msg)
      onError?.(msg)
    } finally {
      setLoading(false)
    }
  }

  const dollars = (amountCents / 100).toFixed(2)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Card field container */}
      <div>
        <label className="block font-sans text-xs uppercase tracking-[3px] text-sky-mid mb-2">
          Card Details
        </label>
        {/* Square injects its iframe into this div */}
        <div
          id={containerId.current}
          className="min-h-[44px] rounded-xl border border-navy/20 bg-white px-1 py-1"
        />
        {!ready && !localError && (
          <p className="font-sans text-xs text-text-soft mt-2">Loading card field…</p>
        )}
      </div>

      {localError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="font-sans text-sm text-red-700">{localError}</p>
        </div>
      )}

      {/* Sandbox hint */}
      {import.meta.env.DEV && (
        <p className="font-sans text-[11px] text-text-soft text-center">
          Sandbox — use card <span className="font-mono">4111 1111 1111 1111</span>, any future date, any CVV
        </p>
      )}

      <button
        type="submit"
        disabled={!ready || loading || disabled}
        className="w-full bg-navy text-sky rounded-full py-3.5 font-sans font-medium text-base hover:bg-navy-deep transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing…' : `${submitLabel} — $${dollars}`}
      </button>
    </form>
  )
}
