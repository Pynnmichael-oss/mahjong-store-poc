import { useState } from 'react'
import { createGuestReservation } from '../services/guestService.js'
import { getTableForSeat } from '../lib/businessRules.js'
import { formatSessionDate, formatTime } from '../lib/dateUtils.js'

export function useGuestBooking() {
  const [step, setStep]                     = useState(1)           // 1 | 2 | 3 | 'confirmed'
  const [selectedSession, setSelectedSession] = useState(null)
  const [selectedSeat, setSelectedSeat]       = useState(null)
  const [guestName, setGuestName]             = useState('')
  const [guestPhone, setGuestPhone]           = useState('')
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState(null)
  const [confirmation, setConfirmation]       = useState(null)

  function selectSession(session) {
    setSelectedSession(session)
    setSelectedSeat(null)
    setStep(2)
  }

  function selectSeat(seat) {
    setSelectedSeat(seat)
    setStep(3)
  }

  function backToSessions() {
    setSelectedSession(null)
    setSelectedSeat(null)
    setStep(1)
  }

  function backToSeats() {
    setSelectedSeat(null)
    setStep(2)
  }

  async function submitBooking() {
    if (!selectedSession || !selectedSeat || !guestName.trim() || !guestPhone.trim()) return
    setLoading(true)
    setError(null)

    const tableInfo   = getTableForSeat(selectedSeat.seat_number)
    const sessionDate = formatSessionDate(selectedSession.date)
    const sessionTime = `${formatTime(selectedSession.start_time)} – ${formatTime(selectedSession.end_time)}`

    try {
      const { reservation } = await createGuestReservation(
        selectedSession.id,
        selectedSeat.id,
        guestName.trim(),
        guestPhone.trim(),
        {
          sessionDate,
          sessionTime,
          tableName:  tableInfo.tableName,
          seatNumber: selectedSeat.seat_number,
        }
      )

      setConfirmation({
        reservation,
        sessionDate,
        sessionTime,
        tableName:  tableInfo.tableName,
        seatNumber: selectedSeat.seat_number,
        guestName:  guestName.trim(),
      })
      setStep('confirmed')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setStep(1)
    setSelectedSession(null)
    setSelectedSeat(null)
    setGuestName('')
    setGuestPhone('')
    setError(null)
    setConfirmation(null)
  }

  return {
    step, selectedSession, selectedSeat,
    guestName, setGuestName,
    guestPhone, setGuestPhone,
    loading, error, confirmation,
    selectSession, selectSeat,
    backToSessions, backToSeats,
    submitBooking, reset,
  }
}
