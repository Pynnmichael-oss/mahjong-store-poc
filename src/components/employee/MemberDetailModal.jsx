import { useState, useEffect } from 'react'
import Modal from '../ui/Modal.jsx'
import Badge from '../ui/Badge.jsx'
import Alert from '../ui/Alert.jsx'
import LoadingSpinner from '../ui/LoadingSpinner.jsx'
import { MEMBERSHIP_TIERS, buildReservationPayload, shouldFlagOverage, countCheckedInPlaysThisWeek } from '../../lib/businessRules.js'
import { formatSessionDate, formatTime } from '../../lib/dateUtils.js'
import { updateMemberProfile, fetchMemberReservations } from '../../services/memberService.js'
import { fetchUpcomingSessions } from '../../services/sessionService.js'
import { fetchSeatsBySession } from '../../services/seatService.js'
import { createReservation } from '../../services/reservationService.js'
import { fetchUserReservations } from '../../services/reservationService.js'
import { getTableForSeat } from '../../lib/businessRules.js'

function TierBadge({ tier }) {
  const t = MEMBERSHIP_TIERS[tier]
  const style = tier === 'subscriber'
    ? 'bg-navy text-sky'
    : tier === 'unlimited'
    ? 'bg-gold-light text-navy border border-gold/30'
    : 'bg-cream text-navy border border-navy/20'
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full font-sans text-xs font-medium ${style}`}>
      {t?.name ?? tier}
    </span>
  )
}

// ─── Add Reservation sub-form ─────────────────────────────────────────────────
function AddReservationForm({ member, onDone }) {
  const [sessions, setSessions]         = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState('')
  const [seats, setSeats]               = useState([])
  const [seatsLoading, setSeatsLoading] = useState(false)
  const [selectedSeat, setSelectedSeat] = useState('')
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState(null)

  useEffect(() => {
    fetchUpcomingSessions()
      .then(setSessions)
      .catch(err => setError(err.message))
      .finally(() => setSessionsLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedSession) { setSeats([]); return }
    setSeatsLoading(true)
    setSelectedSeat('')
    fetchSeatsBySession(selectedSession)
      .then(all => setSeats(all.filter(s => s.status === 'available')))
      .catch(err => setError(err.message))
      .finally(() => setSeatsLoading(false))
  }, [selectedSession])

  async function handleSubmit() {
    if (!selectedSession || !selectedSeat) return
    setSaving(true)
    setError(null)
    try {
      const existing = await fetchUserReservations(member.id)
      const weeklyCount = countCheckedInPlaysThisWeek(existing)
      const isFlagged = shouldFlagOverage(member.membership_type, weeklyCount)

      const seatObj = seats.find(s => s.id === selectedSeat)
      const payload = buildReservationPayload({
        userId:              member.id,
        sessionId:           selectedSession,
        seatId:              selectedSeat,
        membershipType:      member.membership_type,
        isFlaggedOverage:    isFlagged,
        isWalkIn:            false,
      })
      await createReservation(payload)
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const selectCls = 'w-full border border-navy/20 rounded-xl px-4 py-2.5 font-sans text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-sky-mid'

  return (
    <div className="border-t border-navy/8 pt-5 mt-5 space-y-4">
      <p className="font-playfair text-navy text-base">Add Reservation</p>
      {error && <Alert type="error">{error}</Alert>}

      {sessionsLoading ? <LoadingSpinner /> : (
        <div>
          <label className="block font-sans text-xs font-medium text-text-mid mb-1.5">Session</label>
          <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)} className={selectCls} style={{ fontSize: '16px' }}>
            <option value="">Select a session…</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {formatSessionDate(s.date)} · {formatTime(s.start_time)} – {formatTime(s.end_time)}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedSession && (
        seatsLoading ? <LoadingSpinner /> : (
          <div>
            <label className="block font-sans text-xs font-medium text-text-mid mb-1.5">
              Seat ({seats.length} available)
            </label>
            <select value={selectedSeat} onChange={e => setSelectedSeat(e.target.value)} className={selectCls} style={{ fontSize: '16px' }}>
              <option value="">Select a seat…</option>
              {seats.map(s => {
                const t = getTableForSeat(s.seat_number)
                return <option key={s.id} value={s.id}>{t.tableName} · Seat {s.seat_number}</option>
              })}
            </select>
          </div>
        )
      )}

      <button
        onClick={handleSubmit}
        disabled={saving || !selectedSession || !selectedSeat}
        className="w-full py-3 rounded-full font-sans text-sm font-medium bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50"
      >
        {saving ? 'Booking…' : 'Confirm Reservation'}
      </button>
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function MemberDetailModal({ member: initialMember, open, onClose, onSaved }) {
  const [member, setMember]             = useState(initialMember)
  const [reservations, setReservations] = useState([])
  const [resLoading, setResLoading]     = useState(true)
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState(null)
  const [showAddRes, setShowAddRes]     = useState(false)

  // local editable state
  const [fullName, setFullName]         = useState(initialMember?.full_name ?? '')
  const [membershipType, setMembershipType] = useState(initialMember?.membership_type ?? 'walk_in')
  const [isActive, setIsActive]         = useState(initialMember?.is_active ?? true)

  useEffect(() => {
    if (!open || !initialMember) return
    setMember(initialMember)
    setFullName(initialMember.full_name ?? '')
    setMembershipType(initialMember.membership_type ?? 'walk_in')
    setIsActive(initialMember.is_active ?? true)
    setResLoading(true)
    fetchMemberReservations(initialMember.id)
      .then(setReservations)
      .finally(() => setResLoading(false))
  }, [open, initialMember])

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updateMemberProfile(member.id, {
        full_name: fullName.trim(),
        membership_type: membershipType,
        is_active: isActive,
      })
      setMember(updated)
      onSaved?.(updated)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleAddResDone() {
    setShowAddRes(false)
    setResLoading(true)
    fetchMemberReservations(member.id).then(setReservations).finally(() => setResLoading(false))
  }

  if (!member) return null

  const inputCls = 'w-full border border-navy/20 rounded-xl px-4 py-2.5 font-sans text-sm text-navy focus:outline-none focus:ring-2 focus:ring-sky-mid'

  return (
    <Modal open={open} onClose={onClose} title={member.full_name ?? 'Member'}>
      <div className="space-y-5">
        {saveError && <Alert type="error">{saveError}</Alert>}

        {/* Editable fields */}
        <div>
          <label className="block font-sans text-xs font-medium text-text-mid mb-1.5">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className={inputCls}
            style={{ fontSize: '16px' }}
          />
        </div>

        <div>
          <label className="block font-sans text-xs font-medium text-text-mid mb-1.5">Email</label>
          <p className="font-sans text-sm text-text-mid px-1">{member.email}</p>
        </div>

        <div>
          <label className="block font-sans text-xs font-medium text-text-mid mb-1.5">Membership</label>
          <select value={membershipType} onChange={e => setMembershipType(e.target.value)} className={inputCls} style={{ fontSize: '16px' }}>
            {Object.values(MEMBERSHIP_TIERS).map(t => (
              <option key={t.key} value={t.key}>{t.name} — {t.priceLabel}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between p-4 bg-cream rounded-xl">
          <div>
            <p className="font-sans text-sm font-medium text-navy">Account status</p>
            <p className="font-sans text-xs text-text-soft">{isActive ? 'Can log in and make reservations' : 'Blocked from logging in'}</p>
          </div>
          <button
            onClick={() => setIsActive(a => !a)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${isActive ? 'bg-sky-mid' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${isActive ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-full font-sans text-sm font-medium bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        {/* Reservation history */}
        <div className="border-t border-navy/8 pt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-playfair text-navy text-base">Reservation History</p>
            <button
              onClick={() => setShowAddRes(s => !s)}
              className="font-sans text-xs text-sky-mid hover:text-navy underline transition-colors"
            >
              {showAddRes ? 'Cancel' : '+ Add Reservation'}
            </button>
          </div>

          {showAddRes && <AddReservationForm member={member} onDone={handleAddResDone} />}

          {resLoading ? (
            <LoadingSpinner />
          ) : reservations.length === 0 ? (
            <p className="font-cormorant italic text-text-soft text-center py-4">No reservations yet.</p>
          ) : (
            <div className="space-y-2">
              {reservations.map(r => {
                const seat = r.seats
                const t = seat ? getTableForSeat(seat.seat_number) : null
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 py-2 border-b border-navy/5 last:border-0">
                    <div>
                      <p className="font-sans text-sm text-navy">
                        {r.sessions ? formatSessionDate(r.sessions.date) : '—'}
                      </p>
                      <p className="font-sans text-xs text-text-soft">
                        {r.sessions ? `${formatTime(r.sessions.start_time)} – ${formatTime(r.sessions.end_time)}` : ''}
                        {t ? ` · ${t.tableName} · Seat ${seat.seat_number}` : ''}
                      </p>
                    </div>
                    <Badge status={r.status} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
