import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import API from '../api/axios'

export default function NewTask() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '', description: '', priority: 'MEDIUM', dueDate: '', assignedTo: '',
  })
  const [users,   setUsers]   = useState([])
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch all users directly for the assignee dropdown
  useEffect(() => {
    API.get('/users').then(({ data }) => {
      setUsers(data.data.users || [])
    }).catch(() => {})
  }, [])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  function validate() {
    if (!form.title.trim()) return 'Title is required.'
    if (form.title.trim().length < 3) return 'Title must be at least 3 characters.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    try {
      const body = {
        title:       form.title.trim(),
        priority:    form.priority,
      }
      if (form.description.trim()) body.description = form.description.trim()
      if (form.dueDate)  body.dueDate   = new Date(form.dueDate).toISOString()
      if (form.assignedTo) body.assignedTo = form.assignedTo

      await API.post('/tasks', body)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-shell">
      <Navbar />
      <div className="form-page">
        <div className="form-page-header">
          <h1 className="form-page-title">Create New Task</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Fill in the details below. Priority defaults to Medium.
          </p>
        </div>

        <div className="form-card">
          {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label>Title *</label>
              <input type="text" name="title" value={form.title} onChange={handleChange}
                placeholder="e.g. Design landing page" required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea name="description" value={form.description} onChange={handleChange}
                placeholder="Add more context about this task…" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label>Priority</label>
                <select name="priority" value={form.priority} onChange={handleChange}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input type="datetime-local" name="dueDate" value={form.dueDate} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label>Assign To</label>
              <select name="assignedTo" value={form.assignedTo} onChange={handleChange}>
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
              {users.length === 0 && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  ℹ️ No users found.
                </p>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="primary" disabled={loading}>
                {loading ? <><span className="spinner spinner-sm" /> Creating…</> : '✅ Create Task'}
              </button>
              <span className="cancel-link" onClick={() => navigate('/dashboard')}>Cancel</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
