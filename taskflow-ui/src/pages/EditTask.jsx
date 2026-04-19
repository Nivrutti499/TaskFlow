import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import API from '../api/axios'

const ACTION_COLORS = { CREATED: 'audit-CREATED', UPDATED: 'audit-UPDATED', DELETED: 'audit-DELETED' }

export default function EditTask() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '', description: '', priority: 'MEDIUM',
    status: 'TODO', dueDate: '', assignedTo: '',
  })
  const [users,     setUsers]     = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [taskRes, usersRes] = await Promise.all([
          API.get(`/tasks/${id}`),
          API.get('/users'),
        ])
        const t = taskRes.data.data.task
        setForm({
          title:       t.title,
          description: t.description || '',
          priority:    t.priority,
          status:      t.status,
          dueDate:     t.dueDate ? t.dueDate.slice(0, 16) : '',
          assignedTo:  t.userId || '',
        })
        setUsers(usersRes.data.data.users || [])

        // Try to fetch audit logs for this task (ADMIN only — graceful fail)
        try {
          const auditRes = await API.get(`/audit?taskId=${id}&limit=20`)
          setAuditLogs(auditRes.data.data.logs || [])
        } catch { /* MANAGER/EMPLOYEE won't have access — skip */ }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

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
    setSaving(true)
    try {
      const body = {
        title:       form.title.trim(),
        priority:    form.priority,
        status:      form.status,
      }
      if (form.description.trim()) body.description = form.description.trim()
      if (form.dueDate)  body.dueDate   = new Date(form.dueDate).toISOString()
      if (form.assignedTo) body.assignedTo = form.assignedTo
      await API.patch(`/tasks/${id}`, body)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="page-shell"><Navbar /><div className="spinner" /></div>
  )

  return (
    <div className="page-shell">
      <Navbar />
      <div className="form-page">
        <div className="form-page-header">
          <h1 className="form-page-title">Edit Task</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Update the task details below.
          </p>
        </div>

        <div className="form-card">
          {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label>Title *</label>
              <input type="text" name="title" value={form.title} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} />
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
                <label>Status</label>
                <select name="status" value={form.status} onChange={handleChange}>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label>Due Date</label>
                <input type="datetime-local" name="dueDate" value={form.dueDate} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Assign To</label>
                <select name="assignedTo" value={form.assignedTo} onChange={handleChange}>
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="primary" disabled={saving}>
                {saving ? <><span className="spinner spinner-sm" /> Saving…</> : '💾 Update Task'}
              </button>
              <span className="cancel-link" onClick={() => navigate('/dashboard')}>Cancel</span>
            </div>
          </form>
        </div>

        {/* Audit History */}
        {auditLogs.length > 0 && (
          <div className="audit-history">
            <h3>📋 Audit History for this Task</h3>
            {auditLogs.map(log => (
              <div className="audit-item" key={log.id}>
                <span className={`audit-action-badge ${ACTION_COLORS[log.action] || ''}`}>{log.action}</span>
                <div className="audit-item-info">
                  <div className="audit-item-action">by {log.user?.name || 'Unknown'} ({log.user?.role})</div>
                  <div className="audit-item-meta">
                    {log.changes ? JSON.stringify(log.changes) : 'No changes recorded'}
                  </div>
                </div>
                <span className="audit-item-time">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
