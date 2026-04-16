import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSession } from '../../hooks/useSessions.js'
import { useSessionReservations } from '../../hooks/useReservations.js'
import { useSeats } from '../../hooks/useSeats.js'
import { useAttendance } from '../../hooks/useAttendance.js'
import QRScanInput from '../../components/checkin/QRScanInput.jsx'
import AttendeeTable from '../../components/employee/AttendeeTable.jsx'
import WalkInForm from '../../components/employee/WalkInForm.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Alert from '../../components/ui/Alert.jsx'
import SquarePaymentForm from '../../components/ui/SquarePaymentForm.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'
import { getMonthlyCheckInCountsBatch } from '../../services/attendanceService.js'

export default function SessionAttendeesPage() {
  const { id: sessionId } = useParams()
  const { user } = useAuth()
  const { session, loading: sessionLoading } = useSession(sessionId)
  const { reservations, loading: resLoading, refresh } = useSessionReservations(sessionId)
  const { seats, refreshSeats } = useSeats(sessionId)
  const {
    processing, error,
    handleQRCheckin, handleMemberNumberCheckin, handleWalkIn, handleNoShow, handleCheckin, handleOverride,
  } = useAttendance()

  const [scanMessage, setScanMessage] = useState(null)
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState(null)
  const [paymentError, setPaymentError] = useState(null)
  const [monthlyCountsMap, setMonthlyCountsMap] = useState({})
  const [flowerLimitTarget, setFlowerLimitTarget] = useState(null) // reservation needing limit warning

  // Batch-fetch monthly counts for all flower_pass members in this session
  useEffect(() => {
    const flowerUserIds = reservations
      .filter(r => r.profiles?.membership_type === 'flower_pass' && r.user_id)
      .map(r => r.user_id)
    if (!flowerUserIds.length) return
    getMonthlyCheckInCountsBatch(flowerUserIds).then(setMonthlyCountsMap)
  }, [reservations])

  function onScan(userId) {
    setScanMessage(null)
    handleQRCheckin(userId, sessionId, () => {
      setScanMessage('Checked in successfully')
      refresh(); refreshSeats()
    })
  }

  function closePaymentModal() {
    setPaymentTarget(null)
    setPaymentError(null)
  }

  function onPaymentSuccess() {
    handleCheckin(paymentTarget.id, paymentTarget.seat_id, () => {
      setScanMessage('Payment collected — checked in!')
      // Refresh monthly counts after check-in
      const flowerUserIds = reservations
        .filter(r => r.profiles?.membership_type === 'flower_pass' && r.user_id)
        .map(r => r.user_id)
      if (flowerUserIds.length) getMonthlyCheckInCountsBatch(flowerUserIds).then(setMonthlyCountsMap)
      refresh()
      closePaymentModal()
    })
  }

  // Called by the regular "Check In" button — intercepts flower_pass limit
  function handleCheckinClick(reservation) {
    const isFlower = reservation.profiles?.membership_type === 'flower_pass'
    const count = monthlyCountsMap[reservation.user_id] ?? 0
    if (isFlower && count >= 8) {
      setFlowerLimitTarget(reservation)
    } else {
      doCheckin(reservation)
    }
  }

  function doCheckin(reservation) {
    handleCheckin(reservation.id, reservation.seat_id, () => {
      setScanMessage('Checked in successfully')
      // Update monthly count locally
      if (reservation.profiles?.membership_type === 'flower_pass') {
        setMonthlyCountsMap(prev => ({
          ...prev,
          [reservation.user_id]: (prev[reservation.user_id] ?? 0) + 1,
        }))
      }
      refresh()
    })
  }

  function onMemberNumber(memberNumber) {
    setScanMessage(null)
    handleMemberNumberCheckin(memberNumber, sessionId, () => {
      setScanMessage('Checked in successfully')
      refresh(); refreshSeats()
    })
  }

  if (sessionLoading) return <PageWrapper><LoadingSpinner /></PageWrapper>

  return (
    <PageWrapper noPad>
      {/* Navy header */}
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Session Management</p>
          {session && (
            <>
              <h1 className="font-playfair text-3xl text-sky">{formatSessionDate(session.date)}</h1>
              <p className="font-sans text-sky/70 text-sm mt-1">
                {formatTime(session.start_time)} – {formatTime(session.end_time)}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">

        {/* QR Scan input */}
        <FadeUp>
          <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-6">
            <h2 className="font-playfair text-lg text-navy mb-4">Check In</h2>
            {scanMessage && <Alert type="success" className="mb-4">{scanMessage}</Alert>}
            {error && <Alert type="error" className="mb-4">{error}</Alert>}
            <QRScanInput
              sessionId={sessionId}
              onScan={onScan}
              onMemberNumber={onMemberNumber}
              disabled={processing}
            />
          </div>
        </FadeUp>

        {/* Attendees table */}
        <FadeUp delay={100}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-playfair text-xl text-navy">
              Attendees{' '}
              <span className="font-sans text-sm text-text-soft font-normal">({reservations.length})</span>
            </h2>
            {/* Desktop Add Walk-In */}
            <button
              onClick={() => setShowWalkIn(true)}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full font-sans text-sm font-medium bg-navy text-sky hover:bg-navy-deep transition-all"
            >
              + Add Walk-In
            </button>
          </div>
          {resLoading ? (
            <LoadingSpinner />
          ) : (
            <AttendeeTable
              reservations={reservations}
              onNoShow={id => handleNoShow(id, () => refresh())}
              onOverride={id => handleOverride(id, user?.id, () => refresh())}
              onPayCheckin={r => { setPaymentTarget(r); setPaymentError(null) }}
              onCheckin={handleCheckinClick}
              monthlyCountsMap={monthlyCountsMap}
              disabled={processing}
            />
          )}
        </FadeUp>

      </div>

      {/* Mobile fixed Add Walk-In */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-warm-white border-t border-navy/10 p-4 shadow-xl">
        <button
          onClick={() => setShowWalkIn(true)}
          className="w-full py-3 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all"
        >
          + Add Walk-In
        </button>
      </div>

      {/* Payment modal — walk-in fee / overage fee */}
      <Modal
        open={!!paymentTarget}
        onClose={closePaymentModal}
        title="Collect Payment"
      >
        {paymentTarget && (
          <div className="space-y-4">
            <div className="bg-cream rounded-xl px-4 py-3">
              <p className="font-sans text-xs uppercase tracking-[3px] text-sky-mid mb-1">
                {paymentTarget.is_walk_in ? 'Walk-In Fee' : 'Overage Fee'}
              </p>
              <p className="font-playfair text-navy text-xl">$20.00</p>
              <p className="font-sans text-sm text-text-soft mt-0.5">
                {paymentTarget.profiles?.full_name ?? paymentTarget.guest_name ?? 'Guest'}
              </p>
            </div>
            {paymentError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="font-sans text-sm text-red-700">{paymentError}</p>
              </div>
            )}
            <SquarePaymentForm
              containerId="square-card-checkin"
              amountCents={2000}
              description={paymentTarget.is_walk_in ? 'Four Winds walk-in fee' : 'Four Winds overage session fee'}
              userId={paymentTarget.user_id}
              reservationId={paymentTarget.id}
              onSuccess={onPaymentSuccess}
              onError={msg => setPaymentError(msg)}
              submitLabel="Collect Payment"
              disabled={processing}
            />
          </div>
        )}
      </Modal>

      {/* Flower Pass limit confirmation modal */}
      <Modal
        open={!!flowerLimitTarget}
        onClose={() => setFlowerLimitTarget(null)}
        title="Session Limit Reached"
      >
        {flowerLimitTarget && (
          <div className="space-y-5">
            <div className="bg-gold-light border border-gold/30 rounded-xl px-4 py-4">
              <p className="font-cormorant italic text-navy text-base leading-relaxed">
                <strong>{flowerLimitTarget.profiles?.full_name ?? 'This member'}</strong> has used all 8 Flower Pass sessions this month. Walk-in rate applies.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  const r = flowerLimitTarget
                  setFlowerLimitTarget(null)
                  setPaymentTarget(r)
                  setPaymentError(null)
                }}
                className="w-full py-3 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all"
              >
                Check In + Charge Walk-In Rate
              </button>
              <button
                onClick={() => setFlowerLimitTarget(null)}
                className="w-full py-3 rounded-full font-sans font-medium text-sm border-[1.5px] border-navy/20 text-navy hover:bg-sky-pale transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showWalkIn} onClose={() => setShowWalkIn(false)} title="Add Walk-In">
        <WalkInForm
          sessionId={sessionId}
          seats={seats}
          onSubmit={params => handleWalkIn(
            { ...params, sessionId, employeeId: user?.id },
            () => { setShowWalkIn(false); refresh(); refreshSeats() }
          )}
          onCancel={() => setShowWalkIn(false)}
          disabled={processing}
        />
      </Modal>
    </PageWrapper>
  )
}
