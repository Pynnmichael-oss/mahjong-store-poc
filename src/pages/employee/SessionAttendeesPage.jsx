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
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'
import {
  getTableForSeat,
  getMembershipLabel,
  getMembershipBadgeClasses,
} from '../../lib/businessRules.js'
import { supabase } from '../../services/supabase.js'
import { checkInReservation, cancelReservationWithRefund } from '../../services/reservationService.js'
import {
  getWeeklyCheckInCountsBatch,
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
      {membershipType && (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-sans text-xs font-medium ${getMembershipBadgeClasses(membershipType)}`}>
          {membershipType === 'founding_member' && (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z"/>
            </svg>
          )}
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
  const [showWalkIn, setShowWalkIn]             = useState(false)
  const [weeklyCountsMap, setWeeklyCountsMap] = useState({})
  const [lastUpdated, setLastUpdated]           = useState(Date.now())
  const [timeSince, setTimeSince]               = useState('just now')
  const [openMenuId, setOpenMenuId]             = useState(null)
  const [cancellingId, setCancellingId]         = useState(null)
  const [cancelError,  setCancelError]          = useState(null)

  // ── Computed stats ─────────────────────────────────────────────────────────
  const checkedInCount = reservations.filter(r => r.status === 'checked_in' || r.status === 'walk_in').length
  const totalSeats     = session?.total_seats ?? 0
  const remaining      = Math.max(0, totalSeats - checkedInCount)

  const isAnyModalOpen = showWalkIn || !!warningTarget

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

  // ── Batch-fetch weekly counts for members with a weekly limit ─────────────
  useEffect(() => {
    const ids = reservations
      .filter(r => ['flower_pass', 'bamboo_pass'].includes(r.profiles?.membership_type) && r.user_id)
      .map(r => r.user_id)
    if (ids.length) getWeeklyCheckInCountsBatch(ids).then(setWeeklyCountsMap)
  }, [reservations])

  // ── Scanner input auto-focus ───────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'scanner') {
      setTimeout(() => scanInputRef.current?.focus(), 150)
    }
  }, [activeTab])

  // Aggressive focus recovery for Zebra USB scanner
  // Scanner acts as HID keyboard — if focus drifts, recapture on any keypress
  useEffect(() => {
    if (activeTab !== 'scanner') return

    function handleGlobalKey(e) {
      if (isAnyModalOpen) return
      if (scanState === 'loading') return
      // If the active element is not the scan input, refocus it
      if (document.activeElement !== scanInputRef.current) {
        scanInputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [activeTab, isAnyModalOpen, scanState])

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
    console.log('[Scanner] handleScan called — raw:', JSON.stringify(rawValue))
    if (scanState === 'loading') return
    clearScanTimer()

    const value = rawValue.trim()
    console.log('[Scanner] trimmed value:', JSON.stringify(value))
    if (!value) return

    const isUUIDTest = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    console.log('[Scanner] UUID test:', isUUIDTest, '| sessionId:', sessionId)
    console.log('[Scanner] about to fetch reservation for userId:', value, 'sessionId:', sessionId)

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

      console.log('[Scanner] reservation fetch result:', JSON.stringify(reservation), 'error:', resErr)

      if (resErr || !reservation) { showScanError('No reservation found for this session'); return }

      if (reservation.status === 'checked_in') { showScanError('Already checked in'); return }
      if (reservation.status === 'cancelled')  { showScanError('Reservation is cancelled'); return }
      if (reservation.status === 'no_show')    { showScanError('Marked as no-show — use Attendees tab to override'); return }

      await doScanCheckin(reservation)
    } catch (err) {
      showScanError(err?.message ?? 'An error occurred')
    }
  }

  async function doScanCheckin(reservation) {
    console.log('[Scanner] doScanCheckin — reservation:', reservation?.id, 'seat:', reservation?.seat_id)
    setScanState('loading')
    try {
      await checkInReservation(reservation.id, reservation.seat_id)

      const tableInfo = reservation.seats ? getTableForSeat(reservation.seats.seat_number) : null
      setScanData({
        name: reservation.profiles?.full_name ?? 'Member',
        membershipType: reservation.profiles?.membership_type ?? 'four_winds_member',
        tableInfo,
        seatNumber: reservation.seats?.seat_number ?? null,
      })
      setScanState('success')

      if (['flower_pass', 'bamboo_pass'].includes(reservation.profiles?.membership_type) && reservation.user_id) {
        setWeeklyCountsMap(prev => ({ ...prev, [reservation.user_id]: (prev[reservation.user_id] ?? 0) + 1 }))
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
    doAttendeeCheckin(reservation)
  }

  function doAttendeeCheckin(reservation) {
    handleCheckin(reservation.id, reservation.seat_id, () => {
      setFlashedRows(prev => new Set([...prev, reservation.id]))
      setTimeout(() => setFlashedRows(prev => { const n = new Set(prev); n.delete(reservation.id); return n }), 1000)
      if (['flower_pass', 'bamboo_pass'].includes(reservation.profiles?.membership_type) && reservation.user_id) {
        setWeeklyCountsMap(prev => ({ ...prev, [reservation.user_id]: (prev[reservation.user_id] ?? 0) + 1 }))
      }
      refresh()
      setLastUpdated(Date.now())
    })
  }

  // ── Manager override helpers ───────────────────────────────────────────────
  async function handleMarkAsCash(reservation) {
    try {
      await checkInReservation(reservation.id, reservation.seat_id)
      refresh()
      setLastUpdated(Date.now())
    } catch (err) {
      console.error('[SessionAttendees] mark-as-cash failed:', err.message)
    }
  }

  async function handleWaiveFee(reservation) {
    try {
      await checkInReservation(reservation.id, reservation.seat_id)
      // Clear overage flag
      await supabase
        .from('reservations')
        .update({ is_flagged_overage: false })
        .eq('id', reservation.id)
      refresh()
      setLastUpdated(Date.now())
    } catch (err) {
      console.error('[SessionAttendees] waive-fee failed:', err.message)
    }
  }

  async function handleEmployeeCancel(reservation) {
    if (!window.confirm(`Cancel reservation for ${reservation.profiles?.full_name ?? 'this member'}? This cannot be undone.`)) return
    setCancellingId(reservation.id)
    setCancelError(null)
    try {
      await cancelReservationWithRefund(reservation.id, user.id, true)
      refresh()
      setLastUpdated(Date.now())
    } catch (err) {
      setCancelError(err.message)
    } finally {
      setCancellingId(null)
    }
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
                console.log('[Scanner] input onChange — val:', JSON.stringify(val), 'length:', val.length)
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
                  doScanCheckin(r)
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
          {cancelError && <Alert type="error">{cancelError}</Alert>}

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
                const weeklyCount   = weeklyCountsMap[r.user_id] ?? null
                const weeklyLimit   = memberTier ? (memberTier === 'flower_pass' ? 2 : memberTier === 'bamboo_pass' ? 1 : null) : null
                const sessionsLeft  = weeklyLimit !== null && weeklyCount !== null
                  ? Math.max(0, weeklyLimit - weeklyCount) : null

                const isGrouped    = !!r.group_reservation_id
                const isNonPrimary = isGrouped && r.is_primary_seat === false

                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-3 px-4 py-3 min-h-[64px] transition-colors duration-500 ${
                      isFlashed ? 'bg-teal-50' : ''
                    } ${isNonPrimary ? 'border-l-4 border-l-sky-light pl-3' : ''}`}
                  >
                    {/* Left: name, badges, seat */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-sans font-medium text-navy text-sm leading-tight">
                          {profile?.membership_type === 'dragon_pass' && <span className="mr-0.5">⭐</span>}
                          {name ?? '—'}
                        </span>
                        {memberTier && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-sans text-[10px] font-medium ${getMembershipBadgeClasses(memberTier)}`}>
                            {memberTier === 'founding_member' && (
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z"/>
                              </svg>
                            )}
                            {getMembershipLabel(memberTier)}
                          </span>
                        )}
                        {isGrouped && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-sans text-[10px] font-medium bg-sky-light text-sky-mid">
                            Group
                          </span>
                        )}
                        {r.is_flagged_overage && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-sans text-[10px] font-medium bg-gold-light border border-gold text-navy">
                            Fee due
                          </span>
                        )}
                      </div>
                      {r.is_primary_seat && r.guest_count > 0 && (
                        <p className="font-cormorant text-text-soft" style={{ fontSize: '12px' }}>
                          +{r.guest_count} guest{r.guest_count !== 1 ? 's' : ''}
                        </p>
                      )}
                      {sessionsLeft !== null && (
                        <p className={`font-sans text-xs ${sessionsLeft === 0 ? 'text-gold font-medium' : 'text-text-soft'}`}>
                          {sessionsLeft === 0 ? 'Weekly limit reached' : `${sessionsLeft} session${sessionsLeft !== 1 ? 's' : ''} left this week`}
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
                      {/* Confirmed — show Check In + No Show + optional overflow */}
                      {r.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => handleNoShow(r.id, () => { refresh(); setLastUpdated(Date.now()) })}
                            disabled={processing}
                            className="px-3 py-1.5 rounded-full font-sans text-xs font-medium border-[1.5px] border-red-300 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                          >
                            No Show
                          </button>
                          <button
                            onClick={() => handleEmployeeCancel(r)}
                            disabled={cancellingId === r.id || processing}
                            className="px-3 py-1.5 rounded-full font-sans text-xs font-medium border-[1.5px] border-red-300 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                          >
                            {cancellingId === r.id ? '…' : 'Cancel'}
                          </button>
                          <button
                            onClick={() => handleAttendeeCheckin(r)}
                            disabled={processing}
                            className="px-3 py-1.5 rounded-full font-sans text-xs font-medium bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50"
                          >
                            Check In
                          </button>
                          {r.is_flagged_overage && (
                            <div className="relative">
                              <button
                                onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}
                                className="p-1.5 rounded-full font-sans text-xs font-medium text-text-soft hover:text-navy hover:bg-sky-pale transition-all"
                              >
                                ⋯
                              </button>
                              {openMenuId === r.id && (
                                <div className="absolute right-0 top-8 bg-white border border-navy/10 rounded-xl shadow-lg z-10 min-w-[140px] py-1">
                                  <button
                                    onClick={() => { handleMarkAsCash(r); setOpenMenuId(null) }}
                                    className="w-full text-left px-4 py-2 font-sans text-xs text-navy hover:bg-sky-pale transition-colors"
                                  >
                                    Mark as Cash
                                  </button>
                                  <button
                                    onClick={() => { handleWaiveFee(r); setOpenMenuId(null) }}
                                    className="w-full text-left px-4 py-2 font-sans text-xs text-navy hover:bg-sky-pale transition-colors"
                                  >
                                    Waive Fee
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Walk_in — show Check In */}
                      {r.status === 'walk_in' && (
                        <button
                          onClick={() => handleAttendeeCheckin(r)}
                          disabled={processing}
                          className="px-3 py-1.5 rounded-full font-sans text-xs font-medium bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50"
                        >
                          Check In
                        </button>
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
