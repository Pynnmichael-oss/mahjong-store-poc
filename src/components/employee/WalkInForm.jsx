import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase.js'
import Button from '../ui/Button.jsx'
import Alert from '../ui/Alert.jsx'
import SeatMap from '../seats/SeatMap.jsx'

export default function WalkInForm({ sessionId, seats, onSubmit, onCancel, disabled }) {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedSeat, setSelectedSeat] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, membership_type')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => setUsers(data || []))
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (!selectedUser || !selectedSeat) {
      setError('Please select a member and a seat.')
      return
    }
    const user = users.find(u => u.id === selectedUser)
    onSubmit({ userId: selectedUser, seatId: selectedSeat.id, membershipType: user?.membership_type ?? 'walk_in' })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Member</label>
        <select
          value={selectedUser}
          onChange={e => setSelectedUser(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Select a member...</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.full_name} ({u.membership_type})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Seat</label>
        <SeatMap seats={seats.filter(s => s.status === 'available')} selectedSeat={selectedSeat} onSelect={setSelectedSeat} />
        {selectedSeat && <p className="text-sm text-gray-600 mt-2">Selected: Seat #{selectedSeat.seat_number}</p>}
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={disabled}>Cancel</Button>
        <Button type="submit" disabled={disabled}>Add Walk-In</Button>
      </div>
    </form>
  )
}
