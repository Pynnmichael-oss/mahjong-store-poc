import { useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import { useMembers } from '../../hooks/useMembers.js'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import Alert from '../../components/ui/Alert.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import { MEMBERSHIP_TIERS } from '../../lib/businessRules.js'
import { updateMembershipType, updateMemberActiveStatus } from '../../services/memberService.js'

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

function MemberRow({ member, onTierChange, onStatusChange, index }) {
  const [saving, setSaving] = useState(false)
  const isAlt = index % 2 === 1

  async function handleTier(e) {
    setSaving(true)
    await onTierChange(member.id, e.target.value)
    setSaving(false)
  }

  async function handleToggleActive() {
    setSaving(true)
    await onStatusChange(member.id, !member.is_active)
    setSaving(false)
  }

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
        <select
          value={member.membership_type}
          onChange={handleTier}
          disabled={saving}
          className="bg-white border border-navy/20 rounded-full px-3 py-1.5 font-sans text-sm text-navy focus:outline-none focus:ring-2 focus:ring-sky-mid"
          style={{ fontSize: '14px' }}
        >
          {Object.values(MEMBERSHIP_TIERS).map(t => (
            <option key={t.key} value={t.key}>{t.name}</option>
          ))}
        </select>
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
          onClick={handleToggleActive}
          disabled={saving}
          className="font-sans text-xs text-text-soft hover:text-red-600 underline transition-colors disabled:opacity-40"
        >
          {member.is_active ? 'Deactivate' : 'Reactivate'}
        </button>
      </td>
    </tr>
  )
}

export default function MembersPage() {
  const { members, loading, error, refresh } = useMembers()
  const [actionError, setActionError] = useState(null)
  const [search, setSearch] = useState('')

  async function handleTierChange(userId, tier) {
    setActionError(null)
    try { await updateMembershipType(userId, tier); refresh() }
    catch (err) { setActionError(err.message) }
  }

  async function handleStatusChange(userId, isActive) {
    setActionError(null)
    try { await updateMemberActiveStatus(userId, isActive); refresh() }
    catch (err) { setActionError(err.message) }
  }

  const filtered = members.filter(m =>
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  )

  const counts = Object.fromEntries(
    Object.keys(MEMBERSHIP_TIERS).map(k => [k, members.filter(m => m.membership_type === k).length])
  )

  return (
    <PageWrapper noPad>
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Staff Portal</p>
          <h1 className="font-playfair text-3xl text-sky">Members</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Tier summary */}
        <FadeUp>
          <div className="grid grid-cols-3 gap-4">
            {Object.values(MEMBERSHIP_TIERS).map(t => (
              <div key={t.key} className="bg-white rounded-2xl border border-navy/8 shadow-sm p-5 text-center">
                <p className="font-playfair text-3xl text-navy">{counts[t.key] ?? 0}</p>
                <p className="font-sans text-sm text-navy font-medium mt-1">{t.name}</p>
                <p className="font-sans text-xs text-text-soft">{t.priceLabel}</p>
              </div>
            ))}
          </div>
        </FadeUp>

        {actionError && <Alert type="error">{actionError}</Alert>}

        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or email..."
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
                    <th className="py-3 px-4 text-left font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">Change</th>
                    <th className="py-3 px-4 text-left font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">Status</th>
                    <th className="py-3 px-4 text-right font-sans text-[11px] uppercase tracking-[3px] text-sky-mid">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      index={i}
                      onTierChange={handleTierChange}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </FadeUp>
        )}
      </div>
    </PageWrapper>
  )
}
