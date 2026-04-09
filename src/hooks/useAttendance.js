import { useState } from 'react'
import { processQRCheckin, processCheckinByMemberNumber, addWalkIn, markNoShow, overrideNoShow } from '../services/attendanceService.js'

export function useAttendance() {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  async function handleQRCheckin(userId, sessionId, onSuccess) {
    setProcessing(true); setError(null)
    try { const r = await processQRCheckin(userId, sessionId); onSuccess?.(r) }
    catch (err) { setError(err.message) }
    finally { setProcessing(false) }
  }

  async function handleMemberNumberCheckin(memberNumber, sessionId, onSuccess) {
    setProcessing(true); setError(null)
    try { const r = await processCheckinByMemberNumber(memberNumber, sessionId); onSuccess?.(r) }
    catch (err) { setError(err.message) }
    finally { setProcessing(false) }
  }

  async function handleWalkIn(params, onSuccess) {
    setProcessing(true); setError(null)
    try { const r = await addWalkIn(params); onSuccess?.(r) }
    catch (err) { setError(err.message) }
    finally { setProcessing(false) }
  }

  async function handleNoShow(reservationId, onSuccess) {
    setProcessing(true); setError(null)
    try { const r = await markNoShow(reservationId); onSuccess?.(r) }
    catch (err) { setError(err.message) }
    finally { setProcessing(false) }
  }

  async function handleOverride(reservationId, employeeId, onSuccess) {
    setProcessing(true); setError(null)
    try { const r = await overrideNoShow(reservationId, employeeId); onSuccess?.(r) }
    catch (err) { setError(err.message) }
    finally { setProcessing(false) }
  }

  return { processing, error, handleQRCheckin, handleMemberNumberCheckin, handleWalkIn, handleNoShow, handleOverride }
}
