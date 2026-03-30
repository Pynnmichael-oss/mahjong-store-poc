import PageWrapper from '../../components/layout/PageWrapper.jsx'
import QRCodeDisplay from '../../components/checkin/QRCodeDisplay.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function QRPage() {
  const { user, profile } = useAuth()
  // QR value encodes the userId so employee can look up reservations
  const qrValue = user?.id ?? ''

  return (
    <PageWrapper title="My QR Code">
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-gray-600 text-sm text-center max-w-xs">
          Present this QR code to the employee when you arrive for your session.
        </p>
        <QRCodeDisplay value={qrValue} size={240} />
        <div className="text-center">
          <div className="font-medium text-gray-900">{profile?.full_name}</div>
          <div className="text-sm text-gray-500 capitalize">{profile?.membership_type?.replace('_', ' ')} member</div>
        </div>
      </div>
    </PageWrapper>
  )
}
