import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Only allows users whose role is in the `roles` array.
 * Redirects to /dashboard otherwise.
 */
export default function RoleRoute({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}
