import { useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import MemberDetailModal from '../../components/employee/MemberDetailModal.jsx'
import { useMembers } from '../../hooks/useMembers.js'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import Alert from '../../components/ui/Alert.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import { MEMBERSHIP_CONFIG, getMembershipLabel, getMembershipBadgeClasses } from '../../lib/businessRules.js'

function TierBadge({ tier }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full font-sans text-xs font-medium ${getMembershipBadgeClasses(tier)}`}>
      {getMembershipLabel(tier)}
    </span>
  )
}

function MemberRow({ member, onView, index }) {
  const isAlt = index % 2 === 1
  return (
    <tr className={`border-b border-navy/5 last:border-0 ${isAlt ? 'bg-sky-pale' : 'bg-white'}`}>
      <td className="py-4 px-4">
        <p className="font-sans font-medium text-navy text-sm">{member.full_name}</p>
        <p className="font-sans text-xs text-text-soft">{member.email}</p>
      </td>
      <td className="py-4 px-4">
        <TierBadge tier={member.membership_type} />
      </td>
      <td className="py-4 px-4">
        <span className={`inline-flex items-center px-3 py-1 rounded-full font-sans text-xs font-medium ${
          member.is_active ? 'bg-sky-light text-navy' : 'bg-red-100 text-red-700'
        }`}>
          {member.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="py-4 px-4 text-right">
        <button
          onClick={() => onView(member)}
          className="px-4 py-1.5 rounded-full font-sans text-xs font-medium border border-navy/20 text-navy hover:bg-sky-pale transition-all"
        >
          View
        </button>
      </td>
    </tr>
  )
}

export default function MembersPage() {
  const { members, loading, error, refresh } = useMembers()
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)

  const filtered = members.filter(m =>
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  )

  const counts = Object.fromEntries(
    Object.keys(MEMBERSHIP_CONFIG).map(k => [k, members.filter(m => m.membership_type === k).length])
  )

  function handleSaved(updated) {
    refresh()
    setSelected(updated)
  }

  return (
    <PageWrapper noPad>
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Staff Portal</p>
          <h1 className="font-playfair text-3xl text-sky">Members</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <FadeUp>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(MEMBERSHIP_CONFIG).map(([k, t]) => (
              <div key={k} className="bg-white rounded-2xl border border-navy/8 shadow-sm p-4 text-center">
                <p className="font-playfair text-3xl text-navy">{counts[k] ?? 0}</p>
                <p className="font-sans text-xs text-navy font-medium mt-1">{t.label}</p>
                <p className="font-sans text-xs text-text-soft">{t.price}</p>
              </div>
            ))}
          </div>
        </FadeUp>

        {error && <Alert type="error">{error?.message ?? String(error)}</Alert>}

        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white border border-navy/20 rounded-full px-5 py-3 font-sans text-base text-navy placeholder:text-text-soft focus:outline-none focus:ring-2 focus:ring-sky-mid"
          style={{ fontSize: '16px' }}
        />

        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState message="No members found." />
        ) : (
          <FadeUp>
            <div className="overflow-x-auto rounded-2xl border border-navy/8 shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-cream border-b border-navy/8">
                    <th className="py-3 px-4 text-left font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">Member</th>
                    <th className="py-3 px-4 text-left font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">Tier</th>
                    <th className="py-3 px-4 text-left font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">Status</th>
                    <th className="py-3 px-4 text-right font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => (
                    <MemberRow key={m.id} member={m} index={i} onView={setSelected} />
                  ))}
                </tbody>
              </table>
            </div>
          </FadeUp>
        )}
      </div>

      <MemberDetailModal
        member={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onSaved={handleSaved}
      />
    </PageWrapper>
  )
}
