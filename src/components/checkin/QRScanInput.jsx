import { useState } from 'react'
import Button from '../ui/Button.jsx'

export default function QRScanInput({ sessionId, onScan, onMemberNumber, disabled }) {
  const [input, setInput] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const val = input.trim()
    if (!val) return
    // If it looks like a UUID, treat as QR scan; otherwise treat as member number
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(val)
    if (isUuid) {
      onScan(val, sessionId)
    } else {
      onMemberNumber(val, sessionId)
    }
    setInput('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Scan or enter QR code / member ID..."
        disabled={disabled}
        autoFocus
        className="flex-1 bg-white border border-navy/20 rounded-full px-5 py-3 text-base font-sans text-navy placeholder:text-text-soft focus:outline-none focus:ring-2 focus:ring-sky-mid focus:border-sky-mid min-h-[52px]"
        style={{ fontSize: '16px' }}
      />
      <Button type="submit" disabled={disabled || !input.trim()} size="lg">
        Check In
      </Button>
    </form>
  )
}
