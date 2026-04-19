import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import API from '../api/axios'

const ACTION_COLORS = { CREATED: 'audit-CREATED', UPDATED: 'audit-UPDATED', DELETED: 'audit-DELETED' }

export default function AuditLog() {
  const [logs,    setLogs]    = useState([])
  const [pagInfo, setPagInfo] = useState({})
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const fetchLogs = useCallback(async (pg = 1) => {
    setLoading(true)
    try {
      const { data } = await API.get(`/audit?page=${pg}&limit=10`)
      setLogs(data.data.logs)
      setPagInfo(data.data.pagination)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogs(1) }, [fetchLogs])

  function changePage(dir) {
    const next = page + dir
    setPage(next)
    fetchLogs(next)
  }

  function formatChanges(changes) {
    if (!changes) return '—'
    try {
      if (changes.before && changes.after) {
        const keys = Object.keys(changes.after)
        return keys.map(k => `${k}: "${changes.before[k]}" → "${changes.after[k]}"`).join(', ') || '—'
      }
      return JSON.stringify(changes)
    } catch { return '—' }
  }

  return (
    <div className="page-shell">
      <Navbar />
      <div className="audit-page">
        <div className="dashboard-header" style={{ marginBottom: '20px' }}>
          <h1 className="dashboard-title">📋 Audit Logs</h1>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Admin view — all task activity
          </span>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {loading ? (
          <div className="spinner" />
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No audit logs yet</h3>
          </div>
        ) : (
          <>
            <div className="audit-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Task</th>
                    <th>Done By</th>
                    <th>Role</th>
                    <th>Changes</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>
                        <span className={`audit-action-badge ${ACTION_COLORS[log.action] || ''}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>{log.task?.title || <em style={{ color: 'var(--text-secondary)' }}>deleted</em>}</td>
                      <td>{log.user?.name || '—'}</td>
                      <td>
                        <span className="role-badge">{log.user?.role || '—'}</span>
                      </td>
                      <td style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {formatChanges(log.changes)}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button className="page-btn" onClick={() => changePage(-1)} disabled={!pagInfo.hasPrevPage}>
                ← Prev
              </button>
              <span className="page-info">
                Page {pagInfo.page} of {pagInfo.totalPages || 1} &nbsp;·&nbsp; {pagInfo.total} records
              </span>
              <button className="page-btn" onClick={() => changePage(1)} disabled={!pagInfo.hasNextPage}>
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
