import { useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import Alert from '../../components/ui/Alert.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import { useFillRateReport, useWeeklyPlaysReport } from '../../hooks/useReports.js'
import { formatSessionDate, formatTime, getWeekBoundaries } from '../../lib/dateUtils.js'

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function today() { return new Date().toISOString().split('T')[0] }

function getMondayOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

// ─── Fill Rate Report ─────────────────────────────────────────────────────────
const DATE_PRESETS = [
  { label: 'Last 7 days',  start: () => addDays(today(), -7),  end: () => today() },
  { label: 'Last 30 days', start: () => addDays(today(), -30), end: () => today() },
  { label: 'This week',    start: () => getMondayOf(today()),  end: () => addDays(getMondayOf(today()), 6) },
  { label: 'Last week',    start: () => addDays(getMondayOf(today()), -7), end: () => addDays(getMondayOf(today()), -1) },
]

function FillRateBar({ pct }) {
  const color = pct >= 75 ? 'bg-sky-mid' : pct >= 50 ? 'bg-gold' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-cream overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-sans text-xs font-medium text-navy w-8 text-right">{pct}%</span>
    </div>
  )
}

function FillRateSection() {
  const [presetIdx, setPresetIdx] = useState(0)
  const preset   = DATE_PRESETS[presetIdx]
  const startDate = preset.start()
  const endDate   = preset.end()

  const { data, loading, error } = useFillRateReport(startDate, endDate)

  const totals = data.reduce((acc, { reservations }) => {
    const reserved   = reservations.filter(r => r.status === 'confirmed').length
    const checkedIn  = reservations.filter(r => r.status === 'checked_in' || r.status === 'walk_in').length
    const noShow     = reservations.filter(r => r.status === 'no_show').length
    acc.reserved   += reserved
    acc.checkedIn  += checkedIn
    acc.noShow     += noShow
    acc.sessions   += 1
    return acc
  }, { reserved: 0, checkedIn: 0, noShow: 0, sessions: 0 })

  const avgFill = totals.sessions
    ? Math.round(((totals.reserved + totals.checkedIn + totals.noShow) / (totals.sessions * 32)) * 100)
    : 0

  return (
    <div className="bg-white rounded-2xl border border-navy/8 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-navy/8">
        <h2 className="font-playfair text-xl text-navy">Session Fill Rate</h2>
        <div className="flex gap-1 bg-cream rounded-xl p-1">
          {DATE_PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPresetIdx(i)}
              className={`px-3 py-1.5 rounded-lg font-sans text-xs font-medium transition-all ${
                presetIdx === i ? 'bg-white shadow-sm text-navy' : 'text-text-soft hover:text-navy'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-10"><LoadingSpinner /></div>
      ) : error ? (
        <div className="px-6 py-4"><Alert type="error">{error}</Alert></div>
      ) : data.length === 0 ? (
        <p className="font-cormorant italic text-text-soft text-center py-10">No sessions in this period.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-cream border-b border-navy/8">
                  {['Date', 'Time', 'Reserved', 'Checked In', 'No Show', 'Fill Rate'].map(h => (
                    <th key={h} className="py-3 px-4 text-left font-sans text-[11px] uppercase tracking-[3px] text-sky-mid whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(({ session, reservations }, i) => {
                  const reserved   = reservations.filter(r => r.status === 'confirmed').length
                  const checkedIn  = reservations.filter(r => r.status === 'checked_in' || r.status === 'walk_in').length
                  const noShow     = reservations.filter(r => r.status === 'no_show').length
                  const total      = reserved + checkedIn + noShow
                  const pct        = Math.round((total / (session.total_seats ?? 32)) * 100)
                  const isAlt      = i % 2 === 1
                  return (
                    <tr key={session.id} className={`border-b border-navy/5 last:border-0 ${isAlt ? 'bg-sky-pale' : 'bg-white'}`}>
                      <td className="py-3 px-4 font-sans text-sm text-navy whitespace-nowrap">{formatSessionDate(session.date)}</td>
                      <td className="py-3 px-4 font-sans text-sm text-text-mid whitespace-nowrap">{formatTime(session.start_time)} – {formatTime(session.end_time)}</td>
                      <td className="py-3 px-4 font-sans text-sm text-navy">{reserved}</td>
                      <td className="py-3 px-4 font-sans text-sm text-sky-mid">{checkedIn}</td>
                      <td className="py-3 px-4 font-sans text-sm text-red-500">{noShow}</td>
                      <td className="py-3 px-4 min-w-[120px]"><FillRateBar pct={pct} /></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-cream border-t border-navy/8">
                  <td colSpan={2} className="py-3 px-4 font-sans text-xs font-medium text-text-mid">
                    {totals.sessions} session{totals.sessions !== 1 ? 's' : ''} · Avg fill rate
                  </td>
                  <td className="py-3 px-4 font-sans text-sm font-medium text-navy">{totals.reserved}</td>
                  <td className="py-3 px-4 font-sans text-sm font-medium text-sky-mid">{totals.checkedIn}</td>
                  <td className="py-3 px-4 font-sans text-sm font-medium text-red-500">{totals.noShow}</td>
                  <td className="py-3 px-4 min-w-[120px]"><FillRateBar pct={avgFill} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Weekly Plays Report ──────────────────────────────────────────────────────
function WeeklyPlaysSection() {
  const [weekStart, setWeekStart] = useState(() => getMondayOf(today()))
  const weekEnd = addDays(weekStart, 6)

  const { data, loading, error } = useWeeklyPlaysReport(weekStart, weekEnd)

  function prevWeek() { setWeekStart(d => addDays(d, -7)) }
  function nextWeek() { setWeekStart(d => addDays(d,  7)) }

  return (
    <div className="bg-white rounded-2xl border border-navy/8 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-navy/8">
        <h2 className="font-playfair text-xl text-navy">Weekly Play Counts</h2>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-2 rounded-full hover:bg-sky-pale transition-colors">
            <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <p className="font-sans text-sm text-navy whitespace-nowrap">
            {formatSessionDate(weekStart)} – {formatSessionDate(weekEnd)}
          </p>
          <button onClick={nextWeek} className="p-2 rounded-full hover:bg-sky-pale transition-colors">
            <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-10"><LoadingSpinner /></div>
      ) : error ? (
        <div className="px-6 py-4"><Alert type="error">{error}</Alert></div>
      ) : data.length === 0 ? (
        <p className="font-cormorant italic text-text-soft text-center py-10">No subscriber plays this week.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="bg-cream border-b border-navy/8">
              {['Member', 'Plays This Week', 'Progress'].map(h => (
                <th key={h} className="py-3 px-4 text-left font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(({ userId, name, count, flagged }, i) => {
              const pct = Math.min(Math.round((count / 3) * 100), 100)
              const isAlt = i % 2 === 1
              return (
                <tr key={userId} className={`border-b border-navy/5 last:border-0 ${isAlt ? 'bg-sky-pale' : 'bg-white'}`}>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-medium text-navy text-sm">{name}</span>
                      {flagged && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-sans text-xs font-medium bg-gold-light text-navy border border-gold/30">
                          Fee due
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 font-sans text-sm text-navy">{count} of 3</td>
                  <td className="py-4 px-4 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-cream overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${count >= 3 ? 'bg-gold' : 'bg-sky-mid'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-sans text-xs text-text-soft w-4">{count}/3</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  return (
    <PageWrapper noPad>
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Staff Portal</p>
          <h1 className="font-playfair text-3xl text-sky">Reports</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <FadeUp><FillRateSection /></FadeUp>
        <FadeUp delay={100}><WeeklyPlaysSection /></FadeUp>
      </div>
    </PageWrapper>
  )
}
