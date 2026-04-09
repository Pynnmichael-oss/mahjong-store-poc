import { useState } from 'react'
import Button from '../ui/Button.jsx'
import Alert from '../ui/Alert.jsx'

const defaultForm = {
  title: '', description: '', event_date: '',
  start_time: '', end_time: '', cost: '', capacity: 20,
}

const inputCls = 'w-full bg-white border border-navy/20 rounded-full px-5 py-3 text-base font-sans text-navy placeholder:text-text-soft focus:outline-none focus:ring-2 focus:ring-sky-mid focus:border-sky-mid'
const labelCls = 'block font-sans text-sm font-medium text-text-mid mb-1.5'

export default function EventForm({ onSubmit, onCancel, disabled }) {
  const [form, setForm] = useState(defaultForm)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.event_date || !form.start_time) {
      setError('Title, date, and start time are required.')
      return
    }
    const startISO = new Date(`${form.event_date}T${form.start_time}`).toISOString()
    const endISO = form.end_time ? new Date(`${form.event_date}T${form.end_time}`).toISOString() : null
    onSubmit({
      title: form.title,
      description: form.description || null,
      event_date: form.event_date,
      start_time: startISO,
      end_time: endISO,
      cost: form.cost ? Number(form.cost) : null,
      capacity: Number(form.capacity) || 20,
      status: 'upcoming',
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label className={labelCls}>Title *</label>
        <input type="text" value={form.title} onChange={e => update('title', e.target.value)} required className={inputCls} style={{ fontSize: '16px' }} />
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3}
          className="w-full bg-white border border-navy/20 rounded-2xl px-5 py-3 text-base font-sans text-navy placeholder:text-text-soft focus:outline-none focus:ring-2 focus:ring-sky-mid resize-none"
          style={{ fontSize: '16px' }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Date *</label>
          <input type="date" value={form.event_date} onChange={e => update('event_date', e.target.value)} required className={inputCls} style={{ fontSize: '16px' }} />
        </div>
        <div>
          <label className={labelCls}>Capacity</label>
          <input type="number" value={form.capacity} onChange={e => update('capacity', e.target.value)} min={1} className={inputCls} style={{ fontSize: '16px' }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Start Time *</label>
          <input type="time" value={form.start_time} onChange={e => update('start_time', e.target.value)} required className={inputCls} style={{ fontSize: '16px' }} />
        </div>
        <div>
          <label className={labelCls}>End Time</label>
          <input type="time" value={form.end_time} onChange={e => update('end_time', e.target.value)} className={inputCls} style={{ fontSize: '16px' }} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Cost per person (leave blank for free)</label>
        <input type="number" step="1" value={form.cost} onChange={e => update('cost', e.target.value)} placeholder="0" className={inputCls} style={{ fontSize: '16px' }} />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={disabled}>Cancel</Button>
        <Button type="submit" disabled={disabled}>Create Event</Button>
      </div>
    </form>
  )
}
