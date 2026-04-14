import { useEffect, useRef, useState } from 'react'
import { chargeCard } from '../../services/paymentService.js'

const APP_ID      = import.meta.env.VITE_SQUARE_APP_ID
const LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID

/**
 * SquarePaymentForm
 *
 * Props:
 *   containerId     {string}   Unique DOM id for the card field (required when multiple instances exist)
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
  containerId = 'square-card-container',
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
  const cardRef               = useRef(null)
  const [ready, setReady]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState(null)

  useEffect(() => {
    console.log('[SquareForm] initializing with:', {
      appId: APP_ID,
      locationId: LOCATION_ID,
      containerId,
    })

    if (!APP_ID || !LOCATION_ID) {
      const msg = 'Square is not configured. Add VITE_SQUARE_APP_ID and VITE_SQUARE_LOCATION_ID to .env'
      console.error('[SquareForm]', msg)
      setLocalError(msg)
      return
    }

    let card = null
    let cancelled = false

    async function init() {
      try {
        const { payments } = await import('@square/web-sdk')
        console.log('[SquareForm] SDK loaded, creating payments instance')
        const paymentsInstance = await payments(APP_ID, LOCATION_ID)
        console.log('[SquareForm] payments instance created, attaching card to #' + containerId)
        card = await paymentsInstance.card()
        await card.attach(`#${containerId}`)
        console.log('[SquareForm] card attached successfully')

        if (!cancelled) {
          cardRef.current = card
          setReady(true)
        }
      } catch (err) {
        console.error('[SquareForm] init error:', err)
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
      if (card) {
        console.log('[SquareForm] destroying card on unmount')
        card.destroy?.()
      }
      cardRef.current = null
    }
  }, [containerId]) // re-init if containerId changes

  async function handleSubmit(e) {
    e.preventDefault()
    if (!cardRef.current || loading || disabled) return

    setLoading(true)
    setLocalError(null)

    try {
      console.log('[SquareForm] tokenizing card...')
      const result = await cardRef.current.tokenize()
      console.log('[SquareForm] tokenize result status:', result.status)

      if (result.status !== 'OK') {
        const msg = result.errors?.[0]?.message ?? 'Card validation failed'
        console.error('[SquareForm] tokenize failed:', result.errors)
        setLocalError(msg)
        onError?.(msg)
        setLoading(false)
        return
      }

      console.log('[SquareForm] token received, about to invoke square-payment')
      console.log('[SquareForm] payload:', {
        token: result.token?.substring(0, 20),
        amountCents,
        description,
        userId,
        membershipType,
      })

      const { paymentId } = await chargeCard({
        sourceId: result.token,
        amountCents,
        description,
        userId,
        reservationId,
        membershipType,
      })

      console.log('[SquareForm] charge success, paymentId:', paymentId)
      onSuccess?.(paymentId)
    } catch (err) {
      console.error('[SquareForm] handleSubmit error:', err)
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
      {/* Card field container — Square injects its iframe here */}
      <div>
        <label className="block font-sans text-xs uppercase tracking-[3px] text-sky-mid mb-2">
          Card Details
        </label>
        <div
          id={containerId}
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
