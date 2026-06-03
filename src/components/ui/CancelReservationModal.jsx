import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  checkCancellationEligibility,
  cancelMultipleReservations,
  processRefund,
} from '../../services/cancellationService.js'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'
import LoadingSpinner from './LoadingSpinner.jsx'
import Alert from './Alert.jsx'

export default function CancelReservationModal({
  groupSeats,
  sessionInfo,
  onConfirm,
  onClose,
}) {
  const { user } = useAuth()

  const [loading,        setLoading]        = useState(true)
  const [eligibilities,  setEligibilities]  = useState({})   // { reservationId: eligibility }
  const [selectedIds,    setSelectedIds]    = useState(new Set())
  const [confirming,     setConfirming]     = useState(false)
  const [error,          setError]          = useState(null)
  const [confirmed,      setConfirmed]      = useState(false)
  const [refundResult,   setRefundResult]   = useState(null)

  useEffect(() => {
    if (!user?.id || !groupSeats?.length) return
    Promise.all(
      groupSeats.map(s =>
        checkCancellationEligibility(s.reservationId, user.id)
          .then(data => [s.reservationId, data])
      )
    )
      .then(results => {
        const map = {}
        for (const [id, data] of results) map[id] = data
        setEligibilities(map)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSeat(seat) {
    setSelectedIds(prev => {
      const next = new Set(prev)

      // Check if the primary is currently selected
      const primarySeat = groupSeats.find(s => s.isPrimary)
      const primarySelected = primarySeat ? prev.has(primarySeat.reservationId) : false

      // If primary is selected and user is trying to toggle a non-primary seat, ignore
      if (primarySelected && !seat.isPrimary) {
        return prev
      }

      if (next.has(seat.reservationId)) {
        next.delete(seat.reservationId)
        // If unchecking primary, also uncheck all auto-selected guest seats
        if (seat.isPrimary) {
          for (const s of groupSeats) {
            if (!s.isPrimary) next.delete(s.reservationId)
          }
        }
      } else {
        next.add(seat.reservationId)
        // If selecting primary, auto-select all other seats in the group
        if (seat.isPrimary) {
          for (const s of groupSeats) next.add(s.reservationId)
        }
      }
      return next
    })
  }

  async function handleConfirm() {
    setConfirming(true)
    setError(null)
    try {
      const ids = Array.from(selectedIds)
      const { totalRefundCents, refunds } = await cancelMultipleReservations({
        reservationIds: ids,
        userId: user.id,
      })

      // Process refunds (best-effort, non-fatal)
      let totalRefunded = 0
      for (const r of refunds) {
        try {
          await processRefund({
            squarePaymentId: r.squarePaymentId,
            amountCents: r.amountCents,
          })
          totalRefunded += r.amountCents
        } catch {
          // Refund failure is non-fatal — reservation is still cancelled
        }
      }

      setRefundResult(totalRefunded > 0 ? totalRefunded : null)
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

        {!loading && !confirmed && (
          <div className="space-y-4">
            {(() => {
              const anyWithinWindow = Object.values(eligibilities).some(e => e?.eligible && e?.hours_until < 24)
              const totalRefundCents = Array.from(selectedIds).reduce((sum, id) => {
                const e = eligibilities[id]
                return sum + (e?.refundable ? (e?.refund_amount ?? 0) : 0)
              }, 0)

              return (
                <>
                  {anyWithinWindow && (
                    <div className="bg-gold-light border border-gold/40 rounded-xl px-4 py-3 flex items-start gap-2">
                      <span className="text-gold mt-0.5 flex-shrink-0">⚠</span>
                      <p className="font-cormorant italic text-navy text-base leading-relaxed">
                        This session starts in less than 24 hours. Cancellations within the 24-hour window are not refundable.
                      </p>
                    </div>
                  )}

                  <p className="font-sans text-sm text-text-mid">Select which seats to cancel:</p>

                  {(() => {
                    const primarySeat = groupSeats.find(s => s.isPrimary)
                    const primarySelected = primarySeat ? selectedIds.has(primarySeat.reservationId) : false
                    const guestSeatsSelected = Array.from(selectedIds).some(id => {
                      const seat = groupSeats.find(s => s.reservationId === id)
                      return seat && !seat.isPrimary
                    })
                    // Only show this notice if cancelling guest seats only (not the primary)
                    // AND outside the 24-hour window (otherwise no refund would apply anyway)
                    const eligibleForRefund = Object.values(eligibilities).some(e => e?.eligible && e?.hours_until >= 24 && e?.refundable)
                    return !primarySelected && guestSeatsSelected && eligibleForRefund ? (
                      <div className="bg-sky-light/40 border border-sky-mid/20 rounded-xl px-4 py-3">
                        <p className="font-cormorant italic text-navy text-base leading-relaxed">
                          Refunds for individual guest seats are processed at the front counter. Please see staff after your session for your refund.
                        </p>
                      </div>
                    ) : null
                  })()}

                  <div className="space-y-2">
                    {groupSeats.map(seat => {
                      const checked = selectedIds.has(seat.reservationId)
                      const primarySeat = groupSeats.find(s => s.isPrimary)
                      const primarySelected = primarySeat ? selectedIds.has(primarySeat.reservationId) : false
                      const isLocked = primarySelected && !seat.isPrimary
                      return (
                        <button
                          key={seat.reservationId}
                          onClick={() => toggleSeat(seat)}
                          disabled={isLocked}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                            checked ? 'border-navy bg-sky-pale' : 'border-navy/10 bg-white hover:border-navy/30'
                          } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            checked ? 'bg-navy border-navy' : 'bg-white border-navy/30'
                          }`}>
                            {checked && (
                              <svg className="w-3 h-3 text-sky" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-sans text-navy text-sm font-medium">
                              Seat {seat.seatNumber}
                            </p>
                            <p className="font-cormorant italic text-text-soft text-sm">
                              {seat.isPrimary ? 'Your seat (primary)' : 'Guest seat'}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {(() => {
                    const primarySeat = groupSeats.find(s => s.isPrimary)
                    const primarySelected = primarySeat ? selectedIds.has(primarySeat.reservationId) : false
                    return primarySelected && groupSeats.length > 1 ? (
                      <p className="font-cormorant italic text-text-soft text-sm">
                        Cancelling your own seat will cancel all guest seats — guests can't attend without you.
                      </p>
                    ) : null
                  })()}

                  {totalRefundCents > 0 && (
                    <p className="font-cormorant text-text-mid text-base">
                      Refund of <span className="font-medium text-navy">${(totalRefundCents / 100).toFixed(2)}</span> will be returned to your card in 5–10 business days.
                    </p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button onClick={onClose} className="flex-1 py-3 rounded-full font-sans text-sm font-medium border-[1.5px] border-navy text-navy hover:bg-sky-pale transition-all">
                      Keep reservation
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={confirming || selectedIds.size === 0}
                      className="flex-1 py-3 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {confirming ? 'Cancelling…' : `Cancel ${selectedIds.size} seat${selectedIds.size !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        )}

      </div>
    </div>
  )
}
