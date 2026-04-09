import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase.js'
import Button from '../ui/Button.jsx'
import Alert from '../ui/Alert.jsx'
import SeatMap from '../seats/SeatMap.jsx'

const inputCls = 'w-full bg-white border border-navy/20 rounded-full px-5 py-3 text-base font-sans text-navy focus:outline-none focus:ring-2 focus:ring-sky-mid'
const labelCls = 'block font-sans text-sm font-medium text-text-mid mb-1.5'

export default function WalkInForm({ sessionId, seats, onSubmit, onCancel, disabled }) {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedSeat, setSelectedSeat] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, membership_type')
      .eq('is_active', true).order('full_name')
      .then(({ data }) => setUsers(data || []))
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (!selectedUser || !selectedSeat) { setError('Please select a member and a seat.'); return }
    const user = users.find(u => u.id === selectedUser)
    onSubmit({ userId: selectedUser, seatId: selectedSeat.id, membershipType: user?.membership_type ?? 'walk_in' })
  }

  const availableSeats = seats.filter(s => s.status === 'available')

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label className={labelCls}>Member</label>
        <select
          value={selectedUser}
          onChange={e => setSelectedUser(e.target.value)}
          className={inputCls}
          style={{ fontSize: '16px' }}
        >
          <option value="">Select a member...</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.full_name} ({u.membership_type})</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Select Seat</label>
        <SeatMap seats={availableSeats} selectedSeat={selectedSeat} onSelect={setSelectedSeat} />
        {selectedSeat && (
          <p className="font-sans text-sm text-sky-mid mt-2 text-center">Selected: Seat #{selectedSeat.seat_number}</p>
        )}
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={disabled}>Cancel</Button>
        <Button type="submit" disabled={disabled}>Add Walk-In</Button>
      </div>
    </form>
  )
}
