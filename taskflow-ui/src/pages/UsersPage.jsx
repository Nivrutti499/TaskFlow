import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import API from '../api/axios'
import { useAuth } from '../context/AuthContext'

const ROLE_COLORS = {
  ADMIN:    { bg: 'rgba(124,58,237,0.15)', color: '#C4B5FD', border: 'rgba(124,58,237,0.35)' },
  MANAGER:  { bg: 'rgba(6,182,212,0.15)',  color: '#67E8F9', border: 'rgba(6,182,212,0.35)' },
  EMPLOYEE: { bg: 'rgba(16,185,129,0.12)', color: '#6EE7B7', border: 'rgba(16,185,129,0.3)' },
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t) }, [onDone])
  return <div className={`toast ${type}`}>{msg}</div>
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const navigate = useNavigate()

  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState(null)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE' })
  const [formErr,  setFormErr]  = useState('')
  const [creating, setCreating] = useState(false)

  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await API.get('/users')
      setUsers(data.data.users)
    } catch {
      showToast('Failed to load users.', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormErr('All fields are required.'); return
    }
    setCreating(true); setFormErr('')
    try {
      await API.post('/users', form)
      showToast(`✅ User "${form.name}" created as ${form.role}.`)
      setForm({ name: '', email: '', password: '', role: 'EMPLOYEE' })
      setShowForm(false)
      fetchUsers()
    } catch (err) {
      setFormErr(err.response?.data?.message || err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      await API.patch(`/users/${userId}/role`, { role: newRole })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      showToast(`Role updated to ${newRole}.`)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update role.', 'error')
    }
  }

  async function handleDelete(userId, name) {
    if (!window.confirm(`Delete user "${name}"? Their tasks will become unassigned.`)) return
    try {
      await API.delete(`/users/${userId}`)
      setUsers(prev => prev.filter(u => u.id !== userId))
      showToast(`User "${name}" deleted.`)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete user.', 'error')
    }
  }

  return (
    <div className="page-shell">
      <Navbar />
      <div className="dashboard-page">

        {/* Header */}
        <div className="dashboard-header" style={{ marginBottom: '28px' }}>
          <div>
            <h1 className="dashboard-title">👥 User Management</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Add users, assign roles, or remove accounts.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="outline" onClick={() => navigate('/dashboard')}>← Dashboard</button>
            <button className="primary" onClick={() => setShowForm(f => !f)}>
              {showForm ? '✕ Cancel' : '+ Add User'}
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div style={{
          background: 'rgba(6,182,212,0.08)',
          border: '1px solid rgba(6,182,212,0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px',
          fontSize: '13px',
          color: '#67E8F9',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          ℹ️ Role changes take effect <strong style={{ color: '#fff' }}>immediately</strong> — the affected user just needs to refresh their browser page.
        </div>

        {/* Stats */}
        <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '28px' }}>
          {['ADMIN','MANAGER','EMPLOYEE'].map(role => {
            const s = ROLE_COLORS[role]
            return (
              <div key={role} className="stat-card" style={{ borderColor: s.border }}>
                <div className="stat-label">{role}S</div>
                <div className="stat-number" style={{ fontSize: '28px', background: 'none', WebkitTextFillColor: s.color, color: s.color }}>
                  {users.filter(u => u.role === role).length}
                </div>
              </div>
            )
          })}
        </div>

        {/* Add User Form */}
        {showForm && (
          <div className="form-card" style={{ marginBottom: '28px', padding: '28px', animation: 'cardIn .25s ease' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
              ✨ Create New User
            </h2>
            {formErr && <div className="auth-error" style={{ marginBottom: '16px' }}>{formErr}</div>}
            <form onSubmit={handleCreate} noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" placeholder="e.g. Jane Doe"
                    value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" placeholder="e.g. jane@company.com"
                    value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input type="password" placeholder="Min 8 chars, upper+lower+number"
                    value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="primary" disabled={creating}>
                  {creating ? <><span className="spinner spinner-sm" /> Creating…</> : '✅ Create User'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        {loading ? (
          <div className="spinner" />
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No users found</h3>
          </div>
        ) : (
          <div className="audit-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const s = ROLE_COLORS[u.role] || ROLE_COLORS.EMPLOYEE
                  const isMe = u.id === me?.id
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {u.name} {isMe && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(you)</span>}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td>
                        {isMe ? (
                          <span className="badge" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                            {u.role}
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            style={{
                              width: 'auto', padding: '4px 10px', fontSize: '12px', fontWeight: 700,
                              background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                              borderRadius: '99px', cursor: 'pointer',
                            }}
                          >
                            <option value="EMPLOYEE">EMPLOYEE</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        {!isMe && (
                          <button className="danger-outline" style={{ padding: '5px 12px', fontSize: '12px' }}
                            onClick={() => handleDelete(u.id, u.name)}>
                            🗑 Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}
