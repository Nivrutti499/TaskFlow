import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { jwtDecode } from 'jwt-decode'
import axios from 'axios'

const AuthContext = createContext(null)

// Bare axios (no circular imports) to fetch /api/users/me
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('taskflow_token'))
  const [user,  setUser]  = useState(null)
  const [ready, setReady] = useState(false)   // true once we've resolved initial auth

  // On token change: decode for quick data, then fetch live role from DB
  useEffect(() => {
    if (!token) {
      setUser(null)
      setReady(true)
      return
    }
    try {
      const decoded = jwtDecode(token)
      if (decoded.exp * 1000 < Date.now()) {
        logout()
        setReady(true)
        return
      }
      // Set decoded immediately so the UI is not blank
      setUser(decoded)
    } catch {
      logout()
      setReady(true)
      return
    }

    // Fetch live user from DB to get the actual current role
    axios.get(`${baseURL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(({ data }) => {
        setUser(prev => ({ ...prev, ...data.data.user }))
      })
      .catch(() => {
        // Token may be expired / revoked — log out
        logout()
      })
      .finally(() => setReady(true))
  }, [token])

  const login = useCallback((newToken, userData) => {
    localStorage.setItem('taskflow_token', newToken)
    setToken(newToken)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('taskflow_token')
    setToken(null)
    setUser(null)
  }, [])

  // Don't render children until we know if the user is authenticated
  if (!ready) return null

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
