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
import Button from '../../components/ui/Button.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'

export default function SessionAttendeesPage() {
  const { id: sessionId } = useParams()
  const { user } = useAuth()
  const { session, loading: sessionLoading } = useSession(sessionId)
  const { reservations, loading: resLoading, refresh } = useSessionReservations(sessionId)
  const { seats, refreshSeats } = useSeats(sessionId)
  const { processing, error, handleQRCheckin, handleWalkIn, handleNoShow, handleOverride } = useAttendance()

  const [scanMessage, setScanMessage] = useState(null)
  const [scanError, setScanError] = useState(null)
  const [showWalkIn, setShowWalkIn] = useState(false)

  async function onScan(userId, sid) {
    setScanMessage(null)
    setScanError(null)
    handleQRCheckin(userId, sid, (result) => {
      setScanMessage(`Checked in: Seat #${result.seat_id}`)
      refresh()
      refreshSeats()
    })
  }

  async function onNoShow(reservationId) {
    handleNoShow(reservationId, () => refresh())
  }

  async function onOverride(reservationId) {
    handleOverride(reservationId, user?.id, () => refresh())
  }

  async function onWalkIn(params) {
    handleWalkIn({ ...params, sessionId, employeeId: user?.id }, () => {
      setShowWalkIn(false)
      refresh()
      refreshSeats()
    })
  }

  if (sessionLoading) return <PageWrapper><LoadingSpinner /></PageWrapper>

  return (
    <PageWrapper>
      {session && (
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            {formatSessionDate(session.date)}
          </h1>
          <p className="text-gray-500 text-sm">{formatTime(session.start_time)} – {formatTime(session.end_time)}</p>
        </div>
      )}

      {/* QR Scan */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h2 className="font-medium text-gray-900 mb-3">Check In by QR</h2>
        {scanMessage && <Alert type="success" className="mb-3">{scanMessage}</Alert>}
        {(scanError || error) && <Alert type="error" className="mb-3">{scanError || error}</Alert>}
        <QRScanInput sessionId={sessionId} onScan={onScan} disabled={processing} />
      </div>

      {/* Attendees */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium text-gray-900">Attendees</h2>
        <Button variant="secondary" onClick={() => setShowWalkIn(true)}>+ Add Walk-In</Button>
      </div>

      {resLoading ? <LoadingSpinner /> : (
        <AttendeeTable
          reservations={reservations}
          onNoShow={onNoShow}
          onOverride={onOverride}
          disabled={processing}
        />
      )}

      <Modal open={showWalkIn} onClose={() => setShowWalkIn(false)} title="Add Walk-In">
        <WalkInForm
          sessionId={sessionId}
          seats={seats}
          onSubmit={onWalkIn}
          onCancel={() => setShowWalkIn(false)}
          disabled={processing}
        />
      </Modal>
    </PageWrapper>
  )
}
