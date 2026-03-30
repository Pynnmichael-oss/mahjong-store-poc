import { useState } from 'react'
import Button from '../ui/Button.jsx'

/**
 * QR scan input: employee scans/types a QR value and submits it.
 * QR value format: "userId:sessionId"
 */
export default function QRScanInput({ sessionId, onScan, disabled }) {
  const [value, setValue] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!value.trim()) return
    // Parse "userId:sessionId" or just userId if scanned differently
    const parts = value.trim().split(':')
    const userId = parts[0]
    onScan(userId, sessionId)
    setValue('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Scan or paste QR code..."
        disabled={disabled}
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        autoFocus
      />
      <Button type="submit" disabled={disabled || !value.trim()}>
        Check In
      </Button>
    </form>
  )
}
