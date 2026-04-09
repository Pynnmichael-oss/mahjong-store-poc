import { useState } from 'react'
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
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'

export default function SessionAttendeesPage() {
  const { id: sessionId } = useParams()
  const { user } = useAuth()
  const { session, loading: sessionLoading } = useSession(sessionId)
  const { reservations, loading: resLoading, refresh } = useSessionReservations(sessionId)
  const { seats, refreshSeats } = useSeats(sessionId)
  const {
    processing, error,
    handleQRCheckin, handleMemberNumberCheckin, handleWalkIn, handleNoShow, handleOverride,
  } = useAttendance()

  const [scanMessage, setScanMessage] = useState(null)
  const [showWalkIn, setShowWalkIn] = useState(false)

  function onScan(userId) {
    setScanMessage(null)
    handleQRCheckin(userId, sessionId, () => {
      setScanMessage('Checked in successfully')
      refresh(); refreshSeats()
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
