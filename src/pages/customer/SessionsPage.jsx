import PageWrapper from '../../components/layout/PageWrapper.jsx'
import SessionList from '../../components/sessions/SessionList.jsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx'
import Alert from '../../components/ui/Alert.jsx'
import { useSessions } from '../../hooks/useSessions.js'

export default function SessionsPage() {
  const { sessions, loading, error } = useSessions()

  return (
    <PageWrapper title="Open Sessions">
      {loading && <LoadingSpinner />}
      {error && <Alert type="error">{error.message}</Alert>}
      {!loading && !error && <SessionList sessions={sessions} showReserveButton />}
    </PageWrapper>
  )
}
