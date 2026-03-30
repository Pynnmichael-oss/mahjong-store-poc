import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, EmployeeRoute, PublicOnlyRoute } from './ProtectedRoute.jsx'

import LoginPage from '../pages/auth/LoginPage.jsx'
import SignupPage from '../pages/auth/SignupPage.jsx'
import DashboardPage from '../pages/customer/DashboardPage.jsx'
import SessionsPage from '../pages/customer/SessionsPage.jsx'
import ReservePage from '../pages/customer/ReservePage.jsx'
import QRPage from '../pages/customer/QRPage.jsx'
import HistoryPage from '../pages/customer/HistoryPage.jsx'
import EmployeeDashboardPage from '../pages/employee/EmployeeDashboardPage.jsx'
import SessionAttendeesPage from '../pages/employee/SessionAttendeesPage.jsx'

export default function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />

        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/sessions" element={<ProtectedRoute><SessionsPage /></ProtectedRoute>} />
        <Route path="/sessions/:id/reserve" element={<ProtectedRoute><ReservePage /></ProtectedRoute>} />
        <Route path="/my-qr" element={<ProtectedRoute><QRPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />

        <Route path="/employee" element={<EmployeeRoute><EmployeeDashboardPage /></EmployeeRoute>} />
        <Route path="/employee/sessions/:id" element={<EmployeeRoute><SessionAttendeesPage /></EmployeeRoute>} />
      </Routes>
    </HashRouter>
  )
}
