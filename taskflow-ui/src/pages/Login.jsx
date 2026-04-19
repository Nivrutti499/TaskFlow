import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import API from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { jwtDecode } from 'jwt-decode'

const DEMO_ACCOUNTS = [
  { label: '👑 Admin',    email: 'admin@taskflow.com',    password: 'Admin@1234' },
  { label: '🧑‍💼 Manager', email: 'manager1@taskflow.com', password: 'Manager@1234' },
  { label: '👷 Employee', email: 'employee1@taskflow.com', password: 'Emp@1111' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [form,    setForm]    = useState({ email: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  function fillDemo(account) {
    setForm({ email: account.email, password: account.password })
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) { setError('All fields are required.'); return }
    setLoading(true)
    try {
      const { data } = await API.post('/auth/login', form)
      const { token, user } = data.data
      const decoded = jwtDecode(token)
      login(token, { ...decoded, name: user.name, email: user.email, role: user.role })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">⚡ TaskFlow</div>
        <p className="auth-subtitle">Sign in to your workspace</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          <div className="form-group">
            <label>Email address</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@company.com"
              autoComplete="off"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Your password"
              autoComplete="new-password"
              required
            />
          </div>
          <button type="submit" className="primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? <><span className="spinner spinner-sm" /> Signing in…</> : 'Sign In'}
          </button>
        </form>

        <p className="auth-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>

        {/* One-click demo accounts */}
        <div style={{ marginTop: '20px' }}>
          <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Quick fill demo account
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.email}
                type="button"
                onClick={() => fillDemo(acc)}
                style={{
                  flex: 1,
                  padding: '8px 6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-accent)',
                  color: 'var(--accent-light)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => e.target.style.background = 'var(--accent-glow)'}
                onMouseLeave={e => e.target.style.background = 'var(--bg-glass)'}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
