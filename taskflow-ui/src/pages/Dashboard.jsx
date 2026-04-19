import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import StatCard from '../components/StatCard'
import TaskCard from '../components/TaskCard'
import API from '../api/axios'
import { useAuth } from '../context/AuthContext'

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t) }, [onDone])
  return <div className={`toast ${type}`}>{msg}</div>
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const [tasks,   setTasks]   = useState([])
  const [page,    setPage]    = useState(1)
  const [pagInfo, setPagInfo] = useState({})
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState(null)

  const [filterStatus,   setFilterStatus]   = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  // ── Derived stats (from current page — full count comes from pagination.total)
  const total    = pagInfo.total ?? 0
  const inProg   = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const done     = tasks.filter(t => t.status === 'DONE').length

  const showToast = (msg, type = 'default') => setToast({ msg, type })

  const fetchTasks = useCallback(async (pg = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: pg, limit: 10 })
      if (filterStatus)   params.set('status',   filterStatus)
      if (filterPriority) params.set('priority', filterPriority)
      const { data } = await API.get(`/tasks?${params}`)
      setTasks(data.data.tasks)
      setPagInfo(data.data.pagination)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterPriority])

  useEffect(() => { setPage(1); fetchTasks(1) }, [filterStatus, filterPriority, fetchTasks])

  function changePage(dir) {
    const next = page + dir
    setPage(next)
    fetchTasks(next)
  }

  async function handleDelete(taskId, title) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return
    try {
      await API.delete(`/tasks/${taskId}`)
      showToast('Task deleted.', 'success')
      fetchTasks(page)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function handleStatusChange(taskId, status) {
    try {
      await API.patch(`/tasks/${taskId}`, { status })
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
      showToast('Status updated!', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="page-shell">
      <Navbar />
      <div className="dashboard-page">
        {/* Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">
            Good {getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          {canCreate && (
            <button className="primary" onClick={() => navigate('/tasks/new')}>
              + New Task
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="stats-row">
          <StatCard label="Total Tasks"   value={total}  icon="📋" />
          <StatCard label="In Progress"   value={inProg}  icon="🟡" />
          <StatCard label="Completed"     value={done}    icon="✅" />
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          {(filterStatus || filterPriority) && (
            <button className="outline" onClick={() => { setFilterStatus(''); setFilterPriority('') }}>
              Clear Filters
            </button>
          )}
          {user?.role === 'ADMIN' && (
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button className="outline" onClick={() => navigate('/users')}>
                👥 Manage Users
              </button>
              <button className="outline" onClick={() => navigate('/audit')}>
                📋 Audit Logs
              </button>
            </div>
          )}
        </div>

        {/* Task list */}
        {loading ? (
          <div className="spinner" />
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No tasks found</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              {canCreate ? 'Click "+ New Task" to get started.' : 'No tasks have been assigned to you yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="task-list">
              {tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="pagination">
              <button className="page-btn" onClick={() => changePage(-1)} disabled={!pagInfo.hasPrevPage}>
                ← Prev
              </button>
              <span className="page-info">
                Page {pagInfo.page} of {pagInfo.totalPages || 1} &nbsp;·&nbsp; {pagInfo.total} tasks
              </span>
              <button className="page-btn" onClick={() => changePage(1)} disabled={!pagInfo.hasNextPage}>
                Next →
              </button>
            </div>
          </>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}
