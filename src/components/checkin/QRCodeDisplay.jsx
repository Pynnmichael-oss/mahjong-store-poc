import { QRCodeSVG } from 'qrcode.react'

export default function QRCodeDisplay({ value, size = 240 }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-navy/8 inline-flex">
      <QRCodeSVG value={value || 'no-id'} size={size} fgColor="#1a3a6b" bgColor="#ffffff" />
    </div>
  )
}
