import PageWrapper from '../../components/layout/PageWrapper.jsx'
import QRCodeDisplay from '../../components/checkin/QRCodeDisplay.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { MEMBERSHIP_TIERS } from '../../lib/businessRules.js'

export default function QRPage() {
  const { user, profile } = useAuth()
  const membershipType = profile?.membership_type ?? 'walk_in'
  const tier = MEMBERSHIP_TIERS[membershipType] ?? MEMBERSHIP_TIERS.walk_in

  return (
    <PageWrapper noPad>
      {/* Navy header */}
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto text-center">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Member Access</p>
          <h1 className="font-playfair text-3xl text-sky">Your Check-In Code</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 sm:px-6 py-12 flex flex-col items-center gap-6">
        <QRCodeDisplay value={user?.id ?? ''} size={260} />

        <p className="font-cormorant italic text-text-mid text-lg text-center leading-relaxed">
          Show this code to staff when you arrive for your session.
        </p>

        <div className="text-center">
          <p className="font-playfair text-xl text-navy">{profile?.full_name ?? '—'}</p>
          <span className={`inline-flex items-center mt-2 px-4 py-1.5 rounded-full font-sans text-xs font-medium ${
            membershipType === 'subscriber' ? 'bg-navy text-sky' : 'bg-cream text-navy border border-navy/20'
          }`}>
            {tier.name}
          </span>
        </div>
      </div>
    </PageWrapper>
  )
}
