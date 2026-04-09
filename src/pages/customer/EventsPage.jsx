import { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useEvents } from '../../hooks/useEvents.js'
import EventList from '../../components/events/EventList.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import Alert from '../../components/ui/Alert.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import { rsvpToEvent, cancelRsvp } from '../../services/eventService.js'
import { supabase } from '../../services/supabase.js'

export default function EventsPage() {
  const { user } = useAuth()
  const { events, loading, error, refresh } = useEvents()
  const [userRsvps, setUserRsvps] = useState([])
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase.from('event_rsvps').select('*').eq('user_id', user.id)
      .then(({ data }) => setUserRsvps(data || []))
  }, [user])

  async function handleRsvp(event) {
    setActionError(null)
    const confirmedCount = (event.event_rsvps || []).filter(r => r.status === 'confirmed').length
    try {
      const newRsvp = await rsvpToEvent(event.id, user.id, confirmedCount, event.capacity)
      setUserRsvps(prev => [...prev, newRsvp])
      refresh()
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function handleCancel(rsvpId) {
    setActionError(null)
    try {
      await cancelRsvp(rsvpId)
      setUserRsvps(prev => prev.map(r => r.id === rsvpId ? { ...r, status: 'cancelled' } : r))
      refresh()
    } catch (err) {
      setActionError(err.message)
    }
  }

  return (
    <PageWrapper noPad>
      {/* Navy header */}
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">What's On</p>
          <h1 className="font-playfair text-3xl text-sky">Events</h1>
        </div>
      </div>

      <div className="bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {actionError && <Alert type="error" className="mb-5">{actionError}</Alert>}
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <Alert type="error">{error.message}</Alert>
          ) : (
            <FadeUp>
              <EventList
                events={events}
                userRsvps={userRsvps}
                onRsvp={handleRsvp}
                onCancel={handleCancel}
              />
            </FadeUp>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
