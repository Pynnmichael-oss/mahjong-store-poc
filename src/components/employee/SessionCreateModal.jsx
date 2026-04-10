import { useState, useEffect } from 'react'
import Modal from '../ui/Modal.jsx'
import Alert from '../ui/Alert.jsx'
import LoadingSpinner from '../ui/LoadingSpinner.jsx'
import { createSessionWithSeats } from '../../services/sessionService.js'
import { formatSessionDate } from '../../lib/dateUtils.js'

const PRESETS = [
  { key: 'morning',   label: 'Morning',   start: '10:00:00', end: '12:00:00', display: '10:00 AM – 12:00 PM' },
  { key: 'afternoon', label: 'Afternoon', start: '14:00:00', end: '16:00:00', display: '2:00 PM – 4:00 PM'   },
  { key: 'evening',   label: 'Evening',   start: '18:00:00', end: '20:00:00', display: '6:00 PM – 8:00 PM'   },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

// Returns the Monday of the week containing the given date string
function getMondayOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ─── Quick Add Tab ────────────────────────────────────────────────────────────
function QuickAddTab({ onCreated }) {
  const [date, setDate] = useState(todayStr())
  const [selected, setSelected] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [created, setCreated] = useState(0)

  function toggle(key) {
    setSelected(s => ({ ...s, [key]: !s[key] }))
  }

  async function handleCreate() {
    const slots = PRESETS.filter(p => selected[p.key])
    if (!date || slots.length === 0) return
    setLoading(true)
    setError(null)
    setCreated(0)
    try {
      let count = 0
      for (const slot of slots) {
        const id = await createSessionWithSeats(date, slot.start, slot.end)
        if (id) count++
      }
      setCreated(count)
      setSelected({})
      onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const anySelected = Object.values(selected).some(Boolean)

  return (
    <div className="space-y-5">
      {created > 0 && (
        <div className="bg-sky-light text-navy rounded-xl px-4 py-3 font-sans text-sm">
          {created} session{created !== 1 ? 's' : ''} created.
        </div>
      )}
      {error && <Alert type="error">{error}</Alert>}

      <div>
        <label className="block font-sans text-sm font-medium text-text-mid mb-1.5">Date</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          min={todayStr()}
          className="w-full border border-navy/20 rounded-full px-4 py-2.5 font-sans text-sm text-navy focus:outline-none focus:ring-2 focus:ring-sky-mid"
          style={{ fontSize: '16px' }}
        />
      </div>

      <div className="space-y-3">
        <p className="font-sans text-sm font-medium text-text-mid">Time slots</p>
        {PRESETS.map(p => (
          <label key={p.key} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
            selected[p.key] ? 'border-navy bg-sky-pale' : 'border-navy/10 hover:border-navy/30'
          }`}>
            <input
              type="checkbox"
              checked={!!selected[p.key]}
              onChange={() => toggle(p.key)}
              className="w-4 h-4 accent-navy"
            />
            <div>
              <p className="font-sans font-medium text-navy text-sm">{p.label}</p>
              <p className="font-sans text-xs text-text-soft">{p.display}</p>
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={handleCreate}
        disabled={loading || !anySelected || !date}
        className="w-full py-3 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50"
      >
        {loading ? 'Creating...' : `Add Session${Object.values(selected).filter(Boolean).length > 1 ? 's' : ''}`}
      </button>
    </div>
  )
}

// ─── Custom Tab ───────────────────────────────────────────────────────────────
function CustomTab({ onCreated }) {
  const [date, setDate] = useState(todayStr())
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime]     = useState('12:00')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [created, setCreated]     = useState(false)

  async function handleCreate() {
    if (!date || !startTime || !endTime) return
    if (endTime <= startTime) { setError('End time must be after start time.'); return }
    setLoading(true)
    setError(null)
    try {
      const id = await createSessionWithSeats(date, startTime + ':00', endTime + ':00')
      setCreated(!!id)
      if (id) onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-navy/20 rounded-full px-4 py-2.5 font-sans text-sm text-navy focus:outline-none focus:ring-2 focus:ring-sky-mid'

  return (
    <div className="space-y-5">
      {created && (
        <div className="bg-sky-light text-navy rounded-xl px-4 py-3 font-sans text-sm">Session created.</div>
      )}
      {error && <Alert type="error">{error}</Alert>}

      <div>
        <label className="block font-sans text-sm font-medium text-text-mid mb-1.5">Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} min={todayStr()} className={inputCls} style={{ fontSize: '16px' }} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-sans text-sm font-medium text-text-mid mb-1.5">Start time</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputCls} style={{ fontSize: '16px' }} />
        </div>
        <div>
          <label className="block font-sans text-sm font-medium text-text-mid mb-1.5">End time</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inputCls} style={{ fontSize: '16px' }} />
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={loading || !date || !startTime || !endTime}
        className="w-full py-3 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Session'}
      </button>
    </div>
  )
}

// ─── Bulk Tab ─────────────────────────────────────────────────────────────────
function BulkTab({ onCreated }) {
  const [weekStart, setWeekStart] = useState(() => getMondayOf(todayStr()))
  const [days, setDays]           = useState({})
  const [slots, setSlots]         = useState({})
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [result, setResult]       = useState(null)

  function toggleDay(i)  { setDays(d  => ({ ...d,  [i]:       !d[i]       })) }
  function toggleSlot(k) { setSlots(s => ({ ...s,  [k]:       !s[k]       })) }

  const weekDates = DAYS.map((_, i) => addDays(weekStart, i))

  const preview = []
  DAYS.forEach((_, i) => {
    if (!days[i]) return
    PRESETS.forEach(p => {
      if (!slots[p.key]) return
      preview.push({ date: weekDates[i], start: p.start, end: p.end, label: `${formatSessionDate(weekDates[i])} — ${p.display}` })
    })
  })

  function prevWeek() { setWeekStart(d => addDays(d, -7)) }
  function nextWeek() { setWeekStart(d => addDays(d,  7)) }

  async function handleCreate() {
    if (preview.length === 0) return
    setLoading(true)
    setError(null)
    try {
      let created = 0
      for (const item of preview) {
        const id = await createSessionWithSeats(item.date, item.start, item.end)
        if (id) created++
      }
      setResult({ total: preview.length, created, skipped: preview.length - created })
      setDays({})
      setSlots({})
      onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const weekEnd = addDays(weekStart, 6)

  return (
    <div className="space-y-5">
      {result && (
        <div className="bg-sky-light text-navy rounded-xl px-4 py-3 font-sans text-sm">
          {result.created} created, {result.skipped} skipped (duplicates).
        </div>
      )}
      {error && <Alert type="error">{error}</Alert>}

      {/* Week selector */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={prevWeek} className="p-2 rounded-full hover:bg-sky-pale transition-colors">
          <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <p className="font-sans text-sm text-navy text-center">
          {formatSessionDate(weekStart)} – {formatSessionDate(weekEnd)}
        </p>
        <button onClick={nextWeek} className="p-2 rounded-full hover:bg-sky-pale transition-colors">
          <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Days */}
      <div>
        <p className="font-sans text-sm font-medium text-text-mid mb-2">Days</p>
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((d, i) => (
            <button
              key={d}
              onClick={() => toggleDay(i)}
              className={`py-2 rounded-lg font-sans text-xs font-medium transition-all ${
                days[i] ? 'bg-navy text-sky' : 'bg-cream text-navy hover:bg-sky-pale'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Time slots */}
      <div>
        <p className="font-sans text-sm font-medium text-text-mid mb-2">Time slots</p>
        <div className="space-y-2">
          {PRESETS.map(p => (
            <label key={p.key} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
              slots[p.key] ? 'border-navy bg-sky-pale' : 'border-navy/10 hover:border-navy/30'
            }`}>
              <input type="checkbox" checked={!!slots[p.key]} onChange={() => toggleSlot(p.key)} className="w-4 h-4 accent-navy" />
              <span className="font-sans text-sm text-navy">{p.label} <span className="text-text-soft">· {p.display}</span></span>
            </label>
          ))}
        </div>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-cream rounded-xl p-4">
          <p className="font-sans text-xs font-medium uppercase tracking-[3px] text-sky-mid mb-2">Preview ({preview.length})</p>
          <ul className="space-y-1">
            {preview.map((item, i) => (
              <li key={i} className="font-sans text-sm text-navy">{item.label}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={loading || preview.length === 0}
        className="w-full py-3 rounded-full font-sans font-medium text-sm bg-navy text-sky hover:bg-navy-deep transition-all disabled:opacity-50"
      >
        {loading ? 'Creating...' : `Create ${preview.length} Session${preview.length !== 1 ? 's' : ''}`}
      </button>
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
const TABS = ['Quick Add', 'Custom', 'Bulk Create']

export default function SessionCreateModal({ open, onClose, onCreated }) {
  const [tab, setTab] = useState(0)

  function handleCreated() {
    onCreated?.()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Session">
      {/* Tabs */}
      <div className="flex gap-1 bg-cream rounded-xl p-1 mb-6">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`flex-1 py-2 rounded-lg font-sans text-xs font-medium transition-all ${
              tab === i ? 'bg-white shadow-sm text-navy' : 'text-text-soft hover:text-navy'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <QuickAddTab onCreated={handleCreated} />}
      {tab === 1 && <CustomTab  onCreated={handleCreated} />}
      {tab === 2 && <BulkTab   onCreated={handleCreated} />}
    </Modal>
  )
}
