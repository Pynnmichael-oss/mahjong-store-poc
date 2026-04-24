import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSession } from '../../hooks/useSessions.js'
import { useSessionReservations } from '../../hooks/useReservations.js'
import { useSeats } from '../../hooks/useSeats.js'
import { useAttendance } from '../../hooks/useAttendance.js'
import WalkInForm from '../../components/employee/WalkInForm.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Badge from '../../components/ui/Badge.jsx'
import SquarePaymentForm from '../../components/ui/SquarePaymentForm.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'
import {
  getTableForSeat,
  getMembershipLabel,
  getMembershipBadgeClasses,
} from '../../lib/businessRules.js'
import { supabase } from '../../services/supabase.js'
import { checkInReservation } from '../../services/reservationService.js'
import {
  getMonthlyCheckInCount,
  getMonthlyCheckInCountsBatch,
} from '../../services/attendanceService.js'

// ─── Status sort priority ──────────────────────────────────────────────────────
const STATUS_PRIORITY = { confirmed: 0, walk_in: 1, no_show: 2, checked_in: 3, cancelled: 4 }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeSinceLabel(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 15) return 'just now'
  if (s < 60) return `${s}s ago`
  return `${Math.floor(s / 60)}m ago`
}

// ─── Scanner feedback panels ──────────────────────────────────────────────────
function ScanDefault() {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-text-soft">
      <svg className="w-20 h-20 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none" />
        <rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none" />
        <rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none" />
        <path strokeLinecap="round" d="M14 14h2m4 0h-2m0 0v2m0 2v2m-4-4h2v2h-2v2h2" />
      </svg>
      <p className="font-cormorant italic text-xl">Ready to scan</p>
    </div>
  )
}

function ScanLoading() {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="w-16 h-16 border-4 border-navy/20 border-t-navy rounded-full animate-spin" />
      <p className="font-cormorant italic text-xl text-navy">Checking in…</p>
    </div>
  )
}

function ScanSuccess({ data }) {
  const { name, membershipType, tableInfo, seatNumber } = data
  return (
    <div className="flex flex-col items-center gap-3 py-6 bg-teal-50 border border-teal-200 rounded-2xl px-6">
      <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center">
        <svg className="w-10 h-10 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="font-playfair text-navy text-3xl font-bold text-center">{name}</p>
      {membershipType && membershipType !== 'walk_in' && (
        <span className={`inline-flex items-center px-3 py-1 rounded-full font-sans text-xs font-medium ${getMembershipBadgeClasses(membershipType)}`}>
          {getMembershipLabel(membershipType)}
        </span>
      )}
      {tableInfo && seatNumber && (
        <p className="font-sans text-sm text-text-mid">{tableInfo.tableName} · Seat {seatNumber}</p>
      )}
      <p className="font-sans text-xs text-teal-600 font-medium mt-1">Checked in ✓</p>
    </div>
  )
}

function ScanError({ message }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 bg-red-50 border border-red-200 rounded-2xl px-6">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <p className="font-sans text-sm text-red-700 text-center font-medium">{message}</p>
    </div>
  )
}

function ScanWarning({ data, onProceed, onCancel }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 bg-gold-light border border-gold/40 rounded-2xl px-6">
      <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center">
        <svg className="w-8 h-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="font-playfair text-navy text-xl font-bold">{data.name}</p>
        <p className="font-sans text-sm text-text-mid mt-1">
          {data.count}/8 Flower Pass sessions used this month
        </p>
        <p className="font-cormorant italic text-navy text-base mt-1">Walk-in rate applies</p>
      </div>
      <div className="flex flex-col gap-2 w-full">
        <button
          onClick={onProceed}
          className="w-full py-3 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all"
        >
          Check In + Charge Walk-In Rate
        </button>
        <button
          onClick={onCancel}
          className="w-full py-2.5 rounded-full font-sans text-sm text-text-soft hover:text-navy transition-colors border border-navy/15 hover:border-navy/30"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function SessionAttendeesPage() {
  const { id: sessionId } = useParams()
  const { user } = useAuth()
  const { session, loading: sessionLoading } = useSession(sessionId)
  const { reservations, loading: resLoading, refresh } = useSessionReservations(sessionId)
  const { seats, refreshSeats } = useSeats(sessionId)
  const { processing, error: attendanceError, handleWalkIn, handleNoShow, handleCheckin, handleOverride } = useAttendance()

  // ── Tab ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('scanner')

  // ── Scanner state machine ──────────────────────────────────────────────────
  const [scanInput, setScanInput]     = useState('')
  const [scanState, setScanState]     = useState('default') // default|loading|success|warning|error
  const [scanData, setScanData]       = useState(null)
  const [scanErrorMsg, setScanErrorMsg] = useState('')
  const [warningTarget, setWarningTarget] = useState(null) // { reservation, name, count }
  const scanInputRef  = useRef(null)
  const scanTimerRef  = useRef(null)

  // ── Attendees tab ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [flashedRows, setFlashedRows] = useState(new Set())

  // ── Shared state ───────────────────────────────────────────────────────────
  const [paymentTarget, setPaymentTarget] = useState(null)
  const [paymentError, setPaymentError]   = useState(null)
  const [showWalkIn, setShowWalkIn]       = useState(false)
  const [monthlyCountsMap, setMonthlyCountsMap] = useState({})
  const [flowerLimitTarget, setFlowerLimitTarget] = useState(null)
  const [lastUpdated, setLastUpdated]     = useState(Date.now())
  const [timeSince, setTimeSince]         = useState('just now')

  // ── Computed stats ─────────────────────────────────────────────────────────
  const checkedInCount = reservations.filter(r => r.status === 'checked_in' || r.status === 'walk_in').length
  const totalSeats     = session?.total_seats ?? 0
  const remaining      = Math.max(0, totalSeats - checkedInCount)

  const isAnyModalOpen = !!paymentTarget || showWalkIn || !!flowerLimitTarget || !!warningTarget

  // ── Auto-refresh every 15s ─────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      refresh()
      setLastUpdated(Date.now())
    }, 15000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update "Updated X ago" label
  useEffect(() => {
    const interval = setInterval(() => setTimeSince(timeSinceLabel(lastUpdated)), 5000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  // ── Batch-fetch monthly counts for flower_pass members ─────────────────────
  useEffect(() => {
    const ids = reservations
      .filter(r => r.profiles?.membership_type === 'flower_pass' && r.user_id)
      .map(r => r.user_id)
    if (ids.length) getMonthlyCheckInCountsBatch(ids).then(setMonthlyCountsMap)
  }, [reservations])

  // ── Scanner input auto-focus ───────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'scanner') {
      setTimeout(() => scanInputRef.current?.focus(), 150)
    }
  }, [activeTab])

  // ── Scanner helpers ────────────────────────────────────────────────────────
  function clearScanTimer() {
    if (scanTimerRef.current) { clearTimeout(scanTimerRef.current); scanTimerRef.current = null }
  }

  function showScanError(msg) {
    setScanErrorMsg(msg)
    setScanState('error')
    clearScanTimer()
    scanTimerRef.current = setTimeout(() => {
      setScanState('default')
      setScanErrorMsg('')
      scanInputRef.current?.focus()
    }, 3000)
  }

  async function handleScan(rawValue) {
    if (scanState === 'loading') return
    clearScanTimer()

    const value = rawValue.trim()
    if (!value) return

    setScanState('loading')

    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

      let userId
      if (isUUID) {
        userId = value
      } else {
        // Member number — look up user_id from profiles
        const memberNum = parseInt(value, 10)
        if (isNaN(memberNum)) { showScanError('QR code not recognized'); return }
        const { data: profileData } = await supabase
          .from('profiles').select('id').eq('member_number', memberNum).single()
        if (!profileData) { showScanError(`No member found with ID ${value}`); return }
        userId = profileData.id
      }

      // Fetch reservation with profile + seat data
      const { data: reservation, error: resErr } = await supabase
        .from('reservations')
        .select('*, profiles(*), seats(*)')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .single()

      if (resErr || !reservation) { showScanError('No reservation found for this session'); return }

      if (reservation.status === 'checked_in') { showScanError('Already checked in'); return }
      if (reservation.status === 'cancelled')  { showScanError('Reservation is cancelled'); return }
      if (reservation.status === 'no_show')    { showScanError('Marked as no-show — use Attendees tab to override'); return }

      // Flower pass monthly limit check
      if (reservation.profiles?.membership_type === 'flower_pass') {
        const count = await getMonthlyCheckInCount(userId)
        if (count >= 8) {
          setScanState('warning')
          setWarningTarget({
            reservation,
            name: reservation.profiles?.full_name ?? 'Member',
            count,
          })
          return
        }
      }

      await doScanCheckin(reservation)
    } catch (err) {
      showScanError(err?.message ?? 'An error occurred')
    }
  }

  async function doScanCheckin(reservation) {
    setScanState('loading')
    try {
      await checkInReservation(reservation.id, reservation.seat_id)

      const tableInfo = reservation.seats ? getTableForSeat(reservation.seats.seat_number) : null
      setScanData({
        name: reservation.profiles?.full_name ?? 'Member',
        membershipType: reservation.profiles?.membership_type ?? 'walk_in',
        tableInfo,
        seatNumber: reservation.seats?.seat_number ?? null,
      })
      setScanState('success')

      if (reservation.profiles?.membership_type === 'flower_pass' && reservation.user_id) {
        setMonthlyCountsMap(prev => ({ ...prev, [reservation.user_id]: (prev[reservation.user_id] ?? 0) + 1 }))
      }

      refresh()
      setLastUpdated(Date.now())

      clearScanTimer()
      scanTimerRef.current = setTimeout(() => {
        setScanState('default')
        setScanData(null)
        scanInputRef.current?.focus()
      }, 4000)
    } catch (err) {
      showScanError(err?.message ?? 'Check-in failed')
    }
  }

  // ── Attendee tab check-in ──────────────────────────────────────────────────
  function handleAttendeeCheckin(reservation) {
    if (reservation.profiles?.membership_type === 'flower_pass') {
      const count = monthlyCountsMap[reservation.user_id] ?? 0
      if (count >= 8) { setFlowerLimitTarget(reservation); return }
    }
    doAttendeeCheckin(reservation)
  }

  function doAttendeeCheckin(reservation) {
    handleCheckin(reservation.id, reservation.seat_id, () => {
      setFlashedRows(prev => new Set([...prev, reservation.id]))
      setTimeout(() => setFlashedRows(prev => { const n = new Set(prev); n.delete(reservation.id); return n }), 1000)
      if (reservation.profiles?.membership_type === 'flower_pass' && reservation.user_id) {
        setMonthlyCountsMap(prev => ({ ...prev, [reservation.user_id]: (prev[reservation.user_id] ?? 0) + 1 }))
      }
      refresh()
      setLastUpdated(Date.now())
    })
  }

  function onPaymentSuccess() {
    handleCheckin(paymentTarget.id, paymentTarget.seat_id, () => {
      refresh()
      setLastUpdated(Date.now())
      setPaymentTarget(null)
      setPaymentError(null)
    })
  }

  // ── Sorted / filtered attendees ────────────────────────────────────────────
  const filteredReservations = reservations
    .filter(r => {
      if (!searchQuery.trim()) return true
      const name = (r.profiles?.full_name ?? r.guest_name ?? '').toLowerCase()
      return name.includes(searchQuery.toLowerCase())
    })
    .sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status] ?? 5
      const pb = STATUS_PRIORITY[b.status] ?? 5
      if (pa !== pb) return pa - pb
      const na = a.profiles?.full_name ?? a.guest_name ?? ''
      const nb = b.profiles?.full_name ?? b.guest_name ?? ''
      return na.localeCompare(nb)
    })

  if (sessionLoading) return <PageWrapper><LoadingSpinner /></PageWrapper>

  return (
    <PageWrapper noPad>
      {/* ── Navy header ─────────────────────────────────────────────────────── */}
      <div className="bg-navy px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto">
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

      {/* ── Tab switcher ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-navy/8 sticky top-16 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex gap-2">
          {[
            { key: 'scanner',   label: 'Scanner'   },
            { key: 'attendees', label: 'Attendees' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2 rounded-full font-sans text-sm font-medium transition-all duration-150 ${
                activeTab === tab.key
                  ? 'bg-navy text-sky'
                  : 'border-[1.5px] border-navy text-navy hover:bg-sky-pale'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto font-sans text-xs text-text-soft self-center">
            Updated {timeSince}
          </span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 1 — SCANNER
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'scanner' && (
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* Session stats strip */}
          <div className="bg-white rounded-2xl border border-navy/8 shadow-sm px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-playfair text-navy text-2xl font-bold">{checkedInCount}</p>
              <p className="font-sans text-xs text-text-soft uppercase tracking-[2px]">Checked in</p>
            </div>
            <div className="h-10 w-px bg-navy/10" />
            <div className="text-center">
              <p className="font-playfair text-navy text-2xl font-bold">{reservations.filter(r => r.status === 'confirmed').length}</p>
              <p className="font-sans text-xs text-text-soft uppercase tracking-[2px]">Confirmed</p>
            </div>
            <div className="h-10 w-px bg-navy/10" />
            <div className="text-right">
              <p className="font-playfair text-navy text-2xl font-bold">{remaining}</p>
              <p className="font-sans text-xs text-text-soft uppercase tracking-[2px]">Remaining</p>
            </div>
          </div>

          {/* Scan input */}
          <div className="bg-white rounded-2xl border border-navy/8 shadow-sm p-6 space-y-5">
            <input
              ref={scanInputRef}
              type="text"
              value={scanInput}
              onChange={e => {
                const val = e.target.value
                setScanInput(val)
                // Auto-trigger on full UUID (USB scanners may not send Enter)
                if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())) {
                  setScanInput('')
                  handleScan(val.trim())
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && scanInput.trim()) {
                  e.preventDefault()
                  const val = scanInput.trim()
                  setScanInput('')
                  handleScan(val)
                }
              }}
              onBlur={() => {
                if (activeTab === 'scanner' && !isAnyModalOpen) {
                  setTimeout(() => scanInputRef.current?.focus(), 500)
                }
              }}
              placeholder="Waiting for scan…"
              disabled={scanState === 'loading'}
              className="w-full text-center font-sans text-base py-4 px-6 border border-navy/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-mid bg-white placeholder:text-text-soft/50 disabled:opacity-50"
              style={{ fontSize: '16px' }}
              autoFocus
              autoComplete="off"
            />

            {/* Feedback display */}
            {scanState === 'default' && <ScanDefault />}
            {scanState === 'loading' && <ScanLoading />}
            {scanState === 'success' && scanData && <ScanSuccess data={scanData} />}
            {scanState === 'error' && <ScanError message={scanErrorMsg} />}
            {scanState === 'warning' && warningTarget && (
              <ScanWarning
                data={warningTarget}
                onProceed={() => {
                  const r = warningTarget.reservation
                  setWarningTarget(null)
                  setScanState('default')
                  setPaymentTarget(r)
                  setPaymentError(null)
                }}
                onCancel={() => {
                  setWarningTarget(null)
                  setScanState('default')
                  scanInputRef.current?.focus()
                }}
              />
            )}
          </div>

          {/* Error alert from hook (e.g. DB error) */}
          {attendanceError && <Alert type="error">{attendanceError}</Alert>}

          {/* Manual check-in link */}
          <p className="text-center">
            <button
              onClick={() => setActiveTab('attendees')}
              className="font-sans text-sm text-sky-mid hover:text-navy transition-colors"
            >
              Can't scan? Check in manually →
            </button>
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 2 — ATTENDEES
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'attendees' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-4">

          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name…"
            className="w-full bg-white border border-navy/20 rounded-full px-5 py-3 font-sans text-sm text-navy placeholder:text-text-soft focus:outline-none focus:ring-2 focus:ring-sky-mid"
            style={{ fontSize: '16px' }}
          />

          {attendanceError && <Alert type="error">{attendanceError}</Alert>}

          {/* Attendee list */}
          {resLoading ? (
            <LoadingSpinner />
          ) : filteredReservations.length === 0 ? (
            <p className="font-cormorant italic text-text-soft text-lg text-center py-8">
              {searchQuery ? 'No results found.' : 'No reservations for this session yet.'}
            </p>
          ) : (
            <div className="bg-white rounded-2xl border border-navy/8 shadow-sm divide-y divide-navy/5 overflow-hidden">
              {filteredReservations.map(r => {
                const profile    = r.profiles
                const seat       = r.seats
                const tableInfo  = seat ? getTableForSeat(seat.seat_number) : null
                const isGuest    = r.is_guest === true
                const name       = isGuest ? r.guest_name : profile?.full_name
                const memberTier = isGuest ? null : profile?.membership_type
                const isFlashed  = flashedRows.has(r.id)
                const needsPayment = r.is_walk_in || r.is_flagged_overage
                const monthlyCount = monthlyCountsMap[r.user_id] ?? null
                const sessionsLeft = memberTier === 'flower_pass' && monthlyCount != null
                  ? Math.max(0, 8 - monthlyCount) : null

                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-3 px-4 py-3 min-h-[64px] transition-colors duration-500 ${
                      isFlashed ? 'bg-teal-50' : ''
                    }`}
                  >
                    {/* Left: name, badges, seat */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-sans font-medium text-navy text-sm leading-tight">
                          {profile?.membership_type === 'dragon_pass' && <span className="mr-0.5">⭐</span>}
                          {name ?? '—'}
                        </span>
                        {memberTier && memberTier !== 'walk_in' && memberTier !== 'subscriber' && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-sans text-[10px] font-medium ${getMembershipBadgeClasses(memberTier)}`}>
                            {getMembershipLabel(memberTier)}
                          </span>
                        )}
                        {r.is_flagged_overage && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-sans text-[10px] font-medium bg-gold-light border border-gold text-navy">
                            Fee due
                          </span>
                        )}
                      </div>
                      {sessionsLeft !== null && (
                        <p className={`font-sans text-xs ${sessionsLeft === 0 ? 'text-gold font-medium' : 'text-text-soft'}`}>
                          {sessionsLeft === 0 ? 'Monthly limit reached' : `${sessionsLeft} session${sessionsLeft !== 1 ? 's' : ''} left`}
                        </p>
                      )}
                      {tableInfo && (
                        <p className="font-sans text-xs text-text-soft">
                          {tableInfo.tableName} · Seat {seat.seat_number}
                        </p>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Confirmed — show Check In + No Show */}
                      {r.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => handleNoShow(r.id, () => { refresh(); setLastUpdated(Date.now()) })}
                            disabled={processing}
                            className="px-3 py-1.5 rounded-full font-sans text-xs font-medium border-[1.5px] border-red-300 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                          >
                            No Show
                          </button>
                          {needsPayment ? (
                            <button
                              onClick={() => { setPaymentTarget(r); setPaymentError(null) }}
                              disabled={processing}
                              className="px-3 py-1.5 rounded-full font-sans text-xs font-medium bg-gold text-navy hover:bg-gold/80 transition-all disabled:opacity-50"
                            >
                              Pay & In
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAttendeeCheckin(r)}
                              disabled={processing}
                              className="px-3 py-1.5 rounded-full font-sans text-xs font-medium bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50"
                            >
                              Check In
                            </button>
                          )}
                        </>
                      )}

                      {/* Walk_in — show Pay & In */}
                      {r.status === 'walk_in' && (
                        needsPayment ? (
                          <button
                            onClick={() => { setPaymentTarget(r); setPaymentError(null) }}
                            disabled={processing}
                            className="px-3 py-1.5 rounded-full font-sans text-xs font-medium bg-gold text-navy hover:bg-gold/80 transition-all disabled:opacity-50"
                          >
                            Pay & In
                          </button>
                        ) : (
                          <Badge status="walk_in" label="Walk-in ✓" />
                        )
                      )}

                      {/* Checked in */}
                      {r.status === 'checked_in' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-sans text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                          ✓ In
                        </span>
                      )}

                      {/* No show */}
                      {r.status === 'no_show' && (
                        <div className="flex items-center gap-2">
                          <Badge status="no_show" />
                          {!isGuest && (
                            <button
                              onClick={() => handleOverride(r.id, user?.id, () => { refresh(); setLastUpdated(Date.now()) })}
                              disabled={processing}
                              className="px-3 py-1.5 rounded-full font-sans text-xs font-medium border-[1.5px] border-sky-mid text-sky-mid hover:bg-sky-light transition-all disabled:opacity-50"
                            >
                              Override
                            </button>
                          )}
                        </div>
                      )}

                      {/* Cancelled */}
                      {r.status === 'cancelled' && <Badge status="cancelled" />}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Desktop Add Walk-In inline */}
          <div className="hidden sm:flex justify-end">
            <button
              onClick={() => setShowWalkIn(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-sans text-sm font-medium bg-navy text-sky hover:bg-navy-deep transition-all"
            >
              + Add Walk-In
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile fixed Add Walk-In ─────────────────────────────────────────── */}
      {activeTab === 'attendees' && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-warm-white border-t border-navy/10 p-4 shadow-xl">
          <button
            onClick={() => setShowWalkIn(true)}
            className="w-full py-3 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all"
          >
            + Add Walk-In
          </button>
        </div>
      )}

      {/* ── Payment modal ────────────────────────────────────────────────────── */}
      <Modal open={!!paymentTarget} onClose={() => { setPaymentTarget(null); setPaymentError(null) }} title="Collect Payment">
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

      {/* ── Flower Pass limit modal (attendees tab) ──────────────────────────── */}
      <Modal open={!!flowerLimitTarget} onClose={() => setFlowerLimitTarget(null)} title="Session Limit Reached">
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

      {/* ── Walk-In modal ────────────────────────────────────────────────────── */}
      <Modal open={showWalkIn} onClose={() => setShowWalkIn(false)} title="Add Walk-In">
        <WalkInForm
          sessionId={sessionId}
          seats={seats}
          onSubmit={params => handleWalkIn(
            { ...params, sessionId, employeeId: user?.id },
            () => { setShowWalkIn(false); refresh(); refreshSeats(); setLastUpdated(Date.now()) }
          )}
          onCancel={() => setShowWalkIn(false)}
          disabled={processing}
        />
      </Modal>
    </PageWrapper>
  )
}
