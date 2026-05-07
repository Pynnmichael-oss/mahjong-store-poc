import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  checkCancellationEligibility,
  cancelReservation,
  processRefund,
} from '../../services/cancellationService.js'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'
import LoadingSpinner from './LoadingSpinner.jsx'
import Alert from './Alert.jsx'

export default function CancelReservationModal({
  reservationId,
  groupId,
  sessionInfo,
  totalSeats,
  onConfirm,
  onClose,
}) {
  const { user } = useAuth()

  const [loading,          setLoading]          = useState(true)
  const [eligibility,      setEligibility]      = useState(null)
  const [cancelWholeGroup, setCancelWholeGroup] = useState(true)
  const [confirming,       setConfirming]       = useState(false)
  const [error,            setError]            = useState(null)
  const [confirmed,        setConfirmed]        = useState(false)
  const [refundResult,     setRefundResult]     = useState(null)

  const isGroup = groupId && totalSeats > 1

  useEffect(() => {
    if (!user?.id) return
    checkCancellationEligibility(reservationId, user.id)
      .then(data => setEligibility(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [reservationId, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConfirm() {
    setConfirming(true)
    setError(null)
    try {
      await cancelReservation({
        reservationId,
        groupId,
        cancelWholeGroup: isGroup && cancelWholeGroup,
        userId: user.id,
      })

      let refunded = false
      if (eligibility?.refundable && eligibility?.square_payment_id) {
        try {
          await processRefund({
            squarePaymentId: eligibility.square_payment_id,
            amountCents: eligibility.refund_amount,
          })
          refunded = true
        } catch {
          // Refund failure is non-fatal — reservation is still cancelled
        }
      }

      setRefundResult(refunded ? eligibility.refund_amount : null)
      setConfirmed(true)
      setTimeout(() => onConfirm(), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setConfirming(false)
    }
  }

  const sessionLabel = sessionInfo
    ? `${formatSessionDate(sessionInfo.date)} · ${formatTime(sessionInfo.start_time)}`
    : ''

  const refundLabel = eligibility?.refund_amount
    ? `$${(eligibility.refund_amount / 100).toFixed(2)}`
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-warm-white rounded-2xl shadow-xl max-w-md w-full p-6">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-sky-pale transition-colors"
        >
          <svg className="w-4 h-4 text-text-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="font-playfair text-navy text-2xl mb-1">Cancel reservation?</h2>
        {sessionLabel && (
          <p className="font-cormorant italic text-text-mid text-base mb-5">{sessionLabel}</p>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-6">
            <LoadingSpinner />
          </div>
        )}

        {/* Success */}
        {confirmed && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-center space-y-1">
            <p className="font-sans text-sm text-green-700 font-medium">Reservation cancelled</p>
            {refundResult && (
              <p className="font-cormorant italic text-green-700 text-base">
                Refund of {`$${(refundResult / 100).toFixed(2)}`} is on its way
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {!loading && !confirmed && error && (
          <Alert type="error" className="mb-4">{error}</Alert>
        )}

        {(() => {
          if (loading || confirmed || !eligibility?.eligible) return null

          const withinWindow  = eligibility.hours_until < 12
          const hasPaidBooking = eligibility.refundable === true && eligibility.refund_amount > 0
          const isFreeBooking  = !withinWindow && !hasPaidBooking

          // Group seat-choice radios — shown in B and C only
          const GroupChoice = isGroup && !withinWindow ? (
            <div className="space-y-2">
              <button onClick={() => setCancelWholeGroup(false)} className="w-full flex items-center gap-3 text-left">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${!cancelWholeGroup ? 'border-navy bg-navy' : 'border-text-soft'}`}>
                  {!cancelWholeGroup && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="font-sans text-navy text-sm">Cancel my seat only</span>
              </button>
              <button onClick={() => setCancelWholeGroup(true)} className="w-full flex items-center gap-3 text-left">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${cancelWholeGroup ? 'border-navy bg-navy' : 'border-text-soft'}`}>
                  {cancelWholeGroup && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="font-sans text-navy text-sm">Cancel all {totalSeats} seats</span>
              </button>
            </div>
          ) : null

          // State A — within 2-hour window
          if (withinWindow) {
            return (
              <div className="space-y-4">
                <div className="bg-gold-light border border-gold/40 rounded-xl px-4 py-3 flex items-start gap-2">
                  <span className="text-gold mt-0.5 flex-shrink-0">⚠</span>
                  <p className="font-cormorant italic text-navy text-base leading-relaxed">
                    This session starts in less than 12 hours. Cancellations within the 12-hour window are not refundable.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={onClose} className="flex-1 py-3 rounded-full font-sans text-sm font-medium border-[1.5px] border-navy text-navy hover:bg-sky-pale transition-all">
                    Keep my reservation
                  </button>
                  <button onClick={handleConfirm} disabled={confirming} className="flex-1 py-3 rounded-full font-sans font-medium text-sm text-white hover:opacity-90 transition-all disabled:opacity-50" style={{ background: '#E24B4A' }}>
                    {confirming ? 'Cancelling…' : 'Cancel without refund'}
                  </button>
                </div>
              </div>
            )
          }

          // State B — outside window, free booking
          if (isFreeBooking) {
            return (
              <div className="space-y-4">
                <p className="font-cormorant italic text-text-mid leading-relaxed" style={{ fontSize: '15px' }}>
                  No charge was made for this booking. You can cancel for free.
                </p>
                {GroupChoice}
                <div className="flex gap-3 pt-1">
                  <button onClick={onClose} className="flex-1 py-3 rounded-full font-sans text-sm font-medium border-[1.5px] border-navy text-navy hover:bg-sky-pale transition-all">
                    Keep my reservation
                  </button>
                  <button onClick={handleConfirm} disabled={confirming} className="flex-1 py-3 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50">
                    {confirming ? 'Cancelling…' : 'Cancel reservation'}
                  </button>
                </div>
              </div>
            )
          }

          // State C — outside window, paid booking with refund
          return (
            <div className="space-y-4">
              <p className="font-cormorant text-text-mid text-base leading-relaxed">
                You will receive a full refund of{' '}
                <span className="font-medium text-navy">{refundLabel}</span>{' '}
                to your card on file within 5–10 business days.
              </p>
              {GroupChoice}
              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 py-3 rounded-full font-sans text-sm font-medium border-[1.5px] border-navy text-navy hover:bg-sky-pale transition-all">
                  Keep my reservation
                </button>
                <button onClick={handleConfirm} disabled={confirming} className="flex-1 py-3 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50">
                  {confirming ? 'Cancelling…' : `Cancel & refund ${refundLabel}`}
                </button>
              </div>
            </div>
          )
        })()}

        {/* Not eligible */}
        {!loading && !confirmed && eligibility && !eligibility.eligible && (
          <div className="space-y-4">
            <p className="font-cormorant italic text-text-mid text-base">{eligibility.reason}</p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-full font-sans text-sm font-medium border-[1.5px] border-navy text-navy hover:bg-sky-pale transition-all"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
