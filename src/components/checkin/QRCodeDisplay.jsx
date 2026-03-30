import { QRCodeSVG } from 'qrcode.react'

export default function QRCodeDisplay({ value, size = 220 }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <QRCodeSVG value={value} size={size} />
      </div>
      <p className="text-xs text-gray-400 text-center max-w-xs">
        Show this QR code to the employee at check-in.
      </p>
    </div>
  )
}
