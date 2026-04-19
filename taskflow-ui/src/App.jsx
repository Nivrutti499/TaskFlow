import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'

import Login     from './pages/Login'
import Register  from './pages/Register'
import Dashboard from './pages/Dashboard'
import NewTask   from './pages/NewTask'
import EditTask  from './pages/EditTask'
import AuditLog  from './pages/AuditLog'
import UsersPage from './pages/UsersPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected — any logged-in user */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/tasks/new" element={
            <ProtectedRoute>
              <RoleRoute roles={['ADMIN', 'MANAGER']}><NewTask /></RoleRoute>
            </ProtectedRoute>
          } />
          <Route path="/tasks/edit/:id" element={
            <ProtectedRoute><EditTask /></ProtectedRoute>
          } />

          {/* ADMIN only */}
          <Route path="/audit" element={
            <ProtectedRoute>
              <RoleRoute roles={['ADMIN']}><AuditLog /></RoleRoute>
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute>
              <RoleRoute roles={['ADMIN']}><UsersPage /></RoleRoute>
            </ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
