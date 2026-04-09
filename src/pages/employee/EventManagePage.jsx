import { useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useAllEvents } from '../../hooks/useEvents.js'
import EventManagerPanel from '../../components/employee/EventManagerPanel.jsx'
import EventForm from '../../components/events/EventForm.jsx'
import Modal from '../../components/ui/Modal.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Alert from '../../components/ui/Alert.jsx'
import FadeUp from '../../components/ui/FadeUp.jsx'
import { createEvent } from '../../services/eventService.js'

export default function EventManagePage() {
  const { user } = useAuth()
  const { events, loading, error, refresh } = useAllEvents()
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  async function handleCreate(payload) {
    setCreating(true)
    setCreateError(null)
    try {
      await createEvent({ ...payload, created_by: user?.id })
      setShowForm(false)
      refresh()
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const upcoming = events.filter(e => e.status === 'upcoming')
  const past     = events.filter(e => e.status !== 'upcoming')

  return (
    <PageWrapper noPad>
      {/* Navy header */}
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Staff Portal</p>
            <h1 className="font-playfair text-3xl text-sky">Manage Events</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex-shrink-0 px-5 py-2.5 rounded-full font-sans text-sm font-medium bg-sky text-navy hover:bg-sky/80 transition-all mb-1"
          >
            + Add Event
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {error && <Alert type="error">{error.message}</Alert>}

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Upcoming events */}
            <FadeUp>
              <h2 className="font-playfair text-xl text-navy mb-4">
                Upcoming <em className="text-sky-mid">Events</em>
              </h2>
              {upcoming.length === 0 ? (
                <EmptyState message="No upcoming events. Create the first one." />
              ) : (
                <div className="space-y-4">
                  {upcoming.map(e => (
                    <EventManagerPanel key={e.id} event={e} onUpdate={refresh} />
                  ))}
                </div>
              )}
            </FadeUp>

            {/* Past events */}
            {past.length > 0 && (
              <FadeUp delay={100}>
                <h2 className="font-playfair text-xl text-navy mb-4">Past Events</h2>
                <div className="space-y-4">
                  {past.map(e => (
                    <EventManagerPanel key={e.id} event={e} onUpdate={refresh} />
                  ))}
                </div>
              </FadeUp>
            )}
          </>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Create Event">
        {createError && <Alert type="error" className="mb-4">{createError}</Alert>}
        <EventForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          disabled={creating}
        />
      </Modal>
    </PageWrapper>
  )
}
