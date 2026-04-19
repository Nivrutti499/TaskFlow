import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="navbar">
      <span className="navbar-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
        ⚡ TaskFlow
      </span>
      <div className="navbar-right">
        {user && (
          <>
            <span className="navbar-user">{user.name || user.email}</span>
            <span className="role-badge">{user.role}</span>
          </>
        )}
        <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
      </div>
    </header>
  )
}
