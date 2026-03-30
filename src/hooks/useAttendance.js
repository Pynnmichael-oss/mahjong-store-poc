import { useState } from 'react'
import { processQRCheckin, addWalkIn, markNoShow, overrideNoShow } from '../services/attendanceService.js'

export function useAttendance() {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  async function handleQRCheckin(userId, sessionId, onSuccess) {
    setProcessing(true)
    setError(null)
    try {
      const result = await processQRCheckin(userId, sessionId)
      onSuccess?.(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  async function handleWalkIn(params, onSuccess) {
    setProcessing(true)
    setError(null)
    try {
      const result = await addWalkIn(params)
      onSuccess?.(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  async function handleNoShow(reservationId, onSuccess) {
    setProcessing(true)
    setError(null)
    try {
      const result = await markNoShow(reservationId)
      onSuccess?.(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  async function handleOverride(reservationId, employeeId, onSuccess) {
    setProcessing(true)
    setError(null)
    try {
      const result = await overrideNoShow(reservationId, employeeId)
      onSuccess?.(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  return { processing, error, handleQRCheckin, handleWalkIn, handleNoShow, handleOverride }
}
