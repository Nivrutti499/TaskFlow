import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STATUS_LABEL = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' }

function formatDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const isOverdue = d < new Date()
  return { label: d.toLocaleDateString(), overdue: isOverdue }
}

function TaskCard({ task, onDelete, onStatusChange }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const role = user?.role
  const canEdit   = role === 'ADMIN' || role === 'MANAGER'
  const canDelete = role === 'ADMIN' || role === 'MANAGER'
  const isEmployee = role === 'EMPLOYEE'
  const isOwn = task.userId === user?.id

  const due = formatDate(task.dueDate)
  const isDone = task.status === 'DONE'

  return (
    <div className="task-card">
      {/* Priority sidebar bar */}
      <div className={`task-priority-bar priority-bar-${task.priority}`} />

      <div className="task-body">
        <div className={`task-title${isDone ? ' done' : ''}`}>{task.title}</div>
        {task.description && (
          <div className="task-desc">{task.description}</div>
        )}
        <div className="task-meta">
          {/* Status — employee can change their own task status */}
          {isEmployee && isOwn ? (
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task.id, e.target.value)}
              style={{ width: 'auto', padding: '3px 8px', fontSize: '12px' }}
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          ) : (
            <span className={`badge badge-${task.status}`}>{STATUS_LABEL[task.status]}</span>
          )}

          <span className={`badge badge-${task.priority}`}>{task.priority}</span>

          {task.assignedTo && (
            <span className="badge badge-assignee">👤 {task.assignedTo.name}</span>
          )}

          {due && (
            <span className={`badge ${due.overdue && !isDone ? 'badge-overdue' : 'badge-due'}`}>
              📅 {due.label}{due.overdue && !isDone ? ' — Overdue' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="task-actions">
        {canEdit && (
          <button className="outline" onClick={() => navigate(`/tasks/edit/${task.id}`)}>
            Edit
          </button>
        )}
        {canDelete && (
          <button className="danger-outline" onClick={() => onDelete(task.id, task.title)}>
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

export default memo(TaskCard)
