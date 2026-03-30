import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export function EmployeeRoute({ children }) {
  const { user, isEmployee, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (!isEmployee) return <Navigate to="/dashboard" replace />
  return children
}

export function PublicOnlyRoute({ children }) {
  const { user, isEmployee, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (user) return <Navigate to={isEmployee ? '/employee' : '/dashboard'} replace />
  return children
}
