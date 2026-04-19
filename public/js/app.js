/* ════════════════════════════════════════════════════
   TASKFLOW FRONTEND — app.js
   All API calls go to /api/... (same origin as Express)
════════════════════════════════════════════════════ */

// ─── State ────────────────────────────────────────
const State = {
  token: localStorage.getItem('tf_token') || null,
  user:  JSON.parse(localStorage.getItem('tf_user') || 'null'),
  currentPage: 'dashboard',
  tasks: { list: [], pagination: {} },
  audit: { list: [], pagination: {} },
  taskPage: 1,
  auditPage: 1,
  filters: { status: '', priority: '' },
  searchQuery: '',
  editingTaskId: null,
  allUsers: [],
};

// ─── API Helper ────────────────────────────────────
async function api(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (State.token) opts.headers['Authorization'] = `Bearer ${State.token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`/api${path}`, opts);
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// ─── Toast ─────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'default') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

// ─── Auth ──────────────────────────────────────────
function switchTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  clearErrors();
}

function clearErrors() {
  ['login-error', 'register-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
  });
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  const txt = btn.querySelector('.btn-text');
  const spin = btn.querySelector('.btn-spinner');
  if (txt && spin) { txt.textContent = loading ? 'Please wait...' : btn.dataset.label || txt.textContent; spin.classList.toggle('hidden', !loading); }
}

async function handleLogin(e) {
  e.preventDefault();
  clearErrors();
  setLoading('login-btn', true);
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const { ok, data } = await api('/auth/login', 'POST', { email, password });
  setLoading('login-btn', false);

  if (!ok) {
    showError('login-error', data.message || 'Login failed');
    return;
  }
  saveSession(data.data.token, data.data.user);
  initApp();
}

async function handleRegister(e) {
  e.preventDefault();
  clearErrors();
  setLoading('register-btn', true);
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  const { ok, data } = await api('/auth/register', 'POST', { name, email, password });
  setLoading('register-btn', false);

  if (!ok) {
    const msg = data.errors?.length ? data.errors.map(e => e.message).join('. ') : data.message;
    showError('register-error', msg || 'Registration failed');
    return;
  }
  saveSession(data.data.token, data.data.user);
  initApp();
}

function saveSession(token, user) {
  State.token = token;
  State.user  = user;
  localStorage.setItem('tf_token', token);
  localStorage.setItem('tf_user', JSON.stringify(user));
}

function handleLogout() {
  State.token = null;
  State.user  = null;
  localStorage.removeItem('tf_token');
  localStorage.removeItem('tf_user');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
}

function togglePassword(id) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

// ─── App Init ─────────────────────────────────────
function initApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  populateUserUI();
  applyRoleVisibility();
  showPage('dashboard');
  if (State.user?.role !== 'EMPLOYEE') loadAllUsers();
}

function populateUserUI() {
  const u = State.user;
  if (!u) return;
  const initial = u.name?.[0]?.toUpperCase() || '?';
  setText('sidebar-name',  u.name);
  setText('sidebar-role',  u.role);
  setText('topbar-name',   u.name.split(' ')[0]);
  setText('sidebar-avatar', initial);
  setText('topbar-avatar',  initial);
  setText('profile-name-display',  u.name);
  setText('profile-email-display', u.email);
  setText('profile-role-display',  u.role);
  setText('profile-avatar-lg',     initial);
  document.getElementById('update-name').value = u.name;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function applyRoleVisibility() {
  const role = State.user?.role;
  const canCreate = role === 'ADMIN' || role === 'MANAGER';

  // Show/hide audit nav (ADMIN only)
  const auditNav = document.getElementById('audit-nav');
  if (auditNav) auditNav.style.display = role === 'ADMIN' ? 'flex' : 'none';

  // Show/hide create buttons
  ['create-task-btn', 'create-task-btn-dash'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.style.display = canCreate ? '' : 'none';
  });
}

// ─── Navigation ────────────────────────────────────
const PAGE_TITLES = {
  dashboard: 'Dashboard',
  tasks:     'My Tasks',
  profile:   'My Profile',
  audit:     'Audit Logs',
};

function showPage(name) {
  State.currentPage = name;
  ['dashboard', 'tasks', 'profile', 'audit'].forEach(p => {
    document.getElementById(`page-${p}`)?.classList.toggle('hidden', p !== name);
  });

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active');
    if (el.getAttribute('onclick')?.includes(`'${name}'`)) el.classList.add('active');
  });

  setText('page-title', PAGE_TITLES[name] || name);

  // Close sidebar on mobile
  if (window.innerWidth <= 900) {
    document.getElementById('sidebar').classList.remove('open');
  }

  if (name === 'dashboard') loadDashboard();
  if (name === 'tasks')     { State.taskPage = 1; loadTasks(); }
  if (name === 'audit')     { State.auditPage = 1; loadAudit(); }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ─── Dashboard ─────────────────────────────────────
async function loadDashboard() {
  const { ok, data } = await api('/tasks?page=1&limit=100');
  if (!ok) return;

  const tasks = data.data.tasks;
  const total = data.data.pagination.total;
  const todo  = tasks.filter(t => t.status === 'TODO').length;
  const prog  = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const done  = tasks.filter(t => t.status === 'DONE').length;

  animateNumber('stat-total',    total);
  animateNumber('stat-todo',     todo);
  animateNumber('stat-progress', prog);
  animateNumber('stat-done',     done);

  const recent = [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  renderTaskList('dashboard-tasks', recent);
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const diff = target - start;
  const steps = 20;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    el.textContent = Math.round(start + (diff * step) / steps);
    if (step >= steps) clearInterval(timer);
  }, 20);
}

// ─── Tasks ─────────────────────────────────────────
async function loadTasks() {
  const container = document.getElementById('tasks-list');
  container.innerHTML = '<div class="loading-state">⏳ Loading tasks...</div>';

  const params = new URLSearchParams({ page: State.taskPage, limit: 10 });
  if (State.filters.status)   params.set('status', State.filters.status);
  if (State.filters.priority) params.set('priority', State.filters.priority);

  const { ok, data } = await api(`/tasks?${params}`);
  if (!ok) { container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load tasks</p></div>'; return; }

  State.tasks.list = data.data.tasks;
  State.tasks.pagination = data.data.pagination;

  renderTaskList('tasks-list', data.data.tasks);
  updatePagination();
}

function applyFilters() {
  State.filters.status   = document.getElementById('filter-status').value;
  State.filters.priority = document.getElementById('filter-priority').value;
  State.taskPage = 1;
  loadTasks();
}

function changePage(dir) {
  const p = State.tasks.pagination;
  State.taskPage = Math.max(1, Math.min(State.taskPage + dir, p.totalPages || 1));
  loadTasks();
}

function updatePagination() {
  const p = State.tasks.pagination;
  document.getElementById('page-info').textContent = `Page ${p.page} of ${p.totalPages || 1}`;
  document.getElementById('prev-btn').disabled = !p.hasPrevPage;
  document.getElementById('next-btn').disabled = !p.hasNextPage;
}

function handleSearch() {
  State.searchQuery = document.getElementById('search-input').value.toLowerCase();
  const filtered = State.tasks.list.filter(t =>
    t.title.toLowerCase().includes(State.searchQuery) ||
    (t.description || '').toLowerCase().includes(State.searchQuery)
  );
  renderTaskList('tasks-list', filtered);
  renderTaskList('dashboard-tasks', filtered.slice(0, 5));
}

// ─── Render Tasks ──────────────────────────────────
function renderTaskList(containerId, tasks) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!tasks.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>No tasks found</h3>
        <p>Try adjusting your filters or create a new task.</p>
      </div>`;
    return;
  }

  container.innerHTML = tasks.map(task => buildTaskCard(task)).join('');
}

function buildTaskCard(task) {
  const role = State.user?.role;
  const canDelete = role === 'ADMIN' || role === 'MANAGER';
  const canEdit   = role === 'ADMIN' || role === 'MANAGER';
  const isEmployee = role === 'EMPLOYEE';

  const due = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = due && due < new Date() && task.status !== 'DONE';
  const dueBadge = due
    ? `<span class="badge ${isOverdue ? 'badge-overdue' : 'badge-due'}">📅 ${due.toLocaleDateString()}</span>`
    : '';

  const assigneeBadge = task.assignedTo
    ? `<span class="badge badge-assignee">👤 ${task.assignedTo.name}</span>`
    : '';

  const statusOptions = isEmployee
    ? `<select class="filter-select" style="padding:4px 8px;font-size:12px;" onchange="quickStatusUpdate('${task.id}', this.value)">
        <option value="TODO" ${task.status==='TODO'?'selected':''}>To Do</option>
        <option value="IN_PROGRESS" ${task.status==='IN_PROGRESS'?'selected':''}>In Progress</option>
        <option value="DONE" ${task.status==='DONE'?'selected':''}>Done</option>
      </select>`
    : `<span class="badge badge-${task.status}">${formatStatus(task.status)}</span>`;

  return `
    <div class="task-card priority-${task.priority} status-${task.status}" data-id="${task.id}">
      <div class="task-main">
        <div class="task-title">${escHtml(task.title)}</div>
        ${task.description ? `<div class="task-desc">${escHtml(task.description)}</div>` : ''}
        <div class="task-meta">
          ${statusOptions}
          <span class="badge badge-${task.priority}">${task.priority}</span>
          ${assigneeBadge}
          ${dueBadge}
        </div>
      </div>
      <div class="task-actions">
        ${canEdit   ? `<button class="btn-icon" title="Edit" onclick="openEditModal('${task.id}')">✏️</button>` : ''}
        ${canDelete ? `<button class="btn-icon btn-danger" title="Delete" onclick="confirmDelete('${task.id}', '${escHtml(task.title)}')">🗑️</button>` : ''}
      </div>
    </div>`;
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatStatus(s) {
  return { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' }[s] || s;
}

async function quickStatusUpdate(taskId, status) {
  const { ok, data } = await api(`/tasks/${taskId}`, 'PATCH', { status });
  if (ok) {
    showToast(`Status updated to ${formatStatus(status)}`, 'success');
    if (State.currentPage === 'dashboard') loadDashboard();
    else loadTasks();
  } else {
    showToast(data.message || 'Failed to update', 'error');
    loadTasks(); // revert UI
  }
}

async function confirmDelete(taskId, title) {
  if (!confirm(`Delete task "${title}"? This cannot be undone.`)) return;
  const { ok, data } = await api(`/tasks/${taskId}`, 'DELETE');
  if (ok) {
    showToast('Task deleted', 'success');
    if (State.currentPage === 'dashboard') loadDashboard();
    else loadTasks();
  } else {
    showToast(data.message || 'Delete failed', 'error');
  }
}

// ─── Task Modal ────────────────────────────────────
function openCreateModal() {
  State.editingTaskId = null;
  document.getElementById('modal-title').textContent = 'Create Task';
  document.getElementById('task-submit-btn').textContent = 'Create Task';
  document.getElementById('task-form').reset();
  document.getElementById('task-form-error').classList.add('hidden');
  document.getElementById('status-group').style.display = 'none';
  document.getElementById('assignee-group').style.display = '';
  document.getElementById('task-modal').classList.remove('hidden');
}

async function openEditModal(taskId) {
  const task = State.tasks.list.find(t => t.id === taskId)
    || State.tasks.list.find(t => t.id === taskId);

  // Fetch fresh if not in state
  let t = task;
  if (!t) {
    const { ok, data } = await api(`/tasks/${taskId}`);
    if (!ok) return;
    t = data.data.task;
  }

  State.editingTaskId = taskId;
  document.getElementById('modal-title').textContent = 'Edit Task';
  document.getElementById('task-submit-btn').textContent = 'Save Changes';
  document.getElementById('task-title').value = t.title;
  document.getElementById('task-desc').value = t.description || '';
  document.getElementById('task-priority').value = t.priority;
  document.getElementById('task-status').value = t.status;
  document.getElementById('task-due').value = t.dueDate ? t.dueDate.slice(0, 16) : '';
  document.getElementById('status-group').style.display = '';
  document.getElementById('assignee-group').style.display = '';
  if (t.userId) document.getElementById('task-assignee').value = t.userId;
  document.getElementById('task-form-error').classList.add('hidden');
  document.getElementById('task-modal').classList.remove('hidden');
}

function closeTaskModal() {
  document.getElementById('task-modal').classList.add('hidden');
  State.editingTaskId = null;
}

function closeModalOnOverlay(e) {
  if (e.target === document.getElementById('task-modal')) closeTaskModal();
}

async function handleTaskSubmit(e) {
  e.preventDefault();
  const errEl = document.getElementById('task-form-error');
  errEl.classList.add('hidden');

  const title       = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const priority    = document.getElementById('task-priority').value;
  const status      = document.getElementById('task-status').value;
  const dueDateRaw  = document.getElementById('task-due').value;
  const assignedTo  = document.getElementById('task-assignee').value;

  const body = { title, priority };
  if (description) body.description = description;
  if (dueDateRaw)  body.dueDate = new Date(dueDateRaw).toISOString();
  if (assignedTo)  body.assignedTo = assignedTo;

  const btn = document.getElementById('task-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  let result;
  if (State.editingTaskId) {
    body.status = status;
    result = await api(`/tasks/${State.editingTaskId}`, 'PATCH', body);
  } else {
    result = await api('/tasks', 'POST', body);
  }

  btn.disabled = false;
  btn.textContent = State.editingTaskId ? 'Save Changes' : 'Create Task';

  if (!result.ok) {
    const msg = result.data.errors?.length
      ? result.data.errors.map(e => e.message).join('. ')
      : result.data.message;
    errEl.textContent = msg || 'Something went wrong';
    errEl.classList.remove('hidden');
    return;
  }

  showToast(State.editingTaskId ? 'Task updated!' : 'Task created!', 'success');
  closeTaskModal();
  if (State.currentPage === 'dashboard') loadDashboard();
  else loadTasks();
}

// ─── Load All Users (for assignee dropdown) ────────
async function loadAllUsers() {
  // Reuse tasks endpoint — we need users, but there's no /users list endpoint
  // so we collect unique assignees from task list
  const { ok, data } = await api('/tasks?page=1&limit=100');
  if (!ok) return;
  const seen = new Set();
  const users = [];
  data.data.tasks.forEach(t => {
    if (t.assignedTo && !seen.has(t.assignedTo.id)) {
      seen.add(t.assignedTo.id);
      users.push(t.assignedTo);
    }
  });
  // Also add current user
  if (State.user && !seen.has(State.user.id)) {
    users.push({ id: State.user.id, name: State.user.name });
  }
  State.allUsers = users;
  const sel = document.getElementById('task-assignee');
  sel.innerHTML = '<option value="">Unassigned</option>' +
    users.map(u => `<option value="${u.id}">${escHtml(u.name)}</option>`).join('');
}

// ─── Audit Logs ────────────────────────────────────
async function loadAudit() {
  const container = document.getElementById('audit-list');
  container.innerHTML = '<div class="loading-state">⏳ Loading audit logs...</div>';

  const params = new URLSearchParams({ page: State.auditPage, limit: 20 });
  const { ok, data } = await api(`/audit?${params}`);
  if (!ok) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Could not load audit logs</p></div>';
    return;
  }

  State.audit.list = data.data.logs;
  State.audit.pagination = data.data.pagination;
  renderAuditLogs(data.data.logs);
  updateAuditPagination();
}

function renderAuditLogs(logs) {
  const container = document.getElementById('audit-list');
  if (!logs.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><h3>No audit logs yet</h3></div>';
    return;
  }
  container.innerHTML = logs.map(log => {
    const time = new Date(log.createdAt).toLocaleString();
    const taskName = log.task ? `"${escHtml(log.task.title)}"` : '(deleted task)';
    return `
      <div class="audit-card">
        <span class="audit-badge audit-${log.action}">${log.action}</span>
        <div class="audit-info">
          <div class="audit-title">${escHtml(log.user?.name || 'Unknown')} → ${taskName}</div>
          <div class="audit-meta">${log.user?.role || ''} · ${log.user?.email || ''}</div>
        </div>
        <span class="audit-time">${time}</span>
      </div>`;
  }).join('');
}

function changeAuditPage(dir) {
  const p = State.audit.pagination;
  State.auditPage = Math.max(1, Math.min(State.auditPage + dir, p.totalPages || 1));
  loadAudit();
}

function updateAuditPagination() {
  const p = State.audit.pagination;
  document.getElementById('audit-page-info').textContent = `Page ${p.page} of ${p.totalPages || 1}`;
  document.getElementById('audit-prev-btn').disabled = !p.hasPrevPage;
  document.getElementById('audit-next-btn').disabled = !p.hasNextPage;
}

// ─── Profile ───────────────────────────────────────
async function handleProfileUpdate(e) {
  e.preventDefault();
  const msgEl = document.getElementById('profile-msg');
  msgEl.classList.add('hidden');

  const name        = document.getElementById('update-name').value.trim();
  const currentPw   = document.getElementById('update-current-pw').value;
  const newPw       = document.getElementById('update-new-pw').value;

  const body = {};
  if (name && name !== State.user.name) body.name = name;
  if (newPw) { body.currentPassword = currentPw; body.newPassword = newPw; }

  if (!Object.keys(body).length) {
    msgEl.textContent = 'No changes to save.';
    msgEl.className = 'form-error';
    msgEl.classList.remove('hidden');
    return;
  }

  const { ok, data } = await api('/users/me', 'PATCH', body);
  if (!ok) {
    const msg = data.errors?.length ? data.errors.map(e => e.message).join('. ') : data.message;
    msgEl.textContent = msg;
    msgEl.className = 'form-error';
    msgEl.classList.remove('hidden');
    return;
  }

  // Update local state
  State.user = { ...State.user, ...data.data.user };
  localStorage.setItem('tf_user', JSON.stringify(State.user));
  populateUserUI();
  msgEl.textContent = '✅ Profile updated successfully!';
  msgEl.className = 'form-success';
  msgEl.classList.remove('hidden');
  showToast('Profile updated!', 'success');

  // Clear password fields
  document.getElementById('update-current-pw').value = '';
  document.getElementById('update-new-pw').value = '';
}

// ─── Boot ──────────────────────────────────────────
(function boot() {
  if (State.token && State.user) {
    initApp();
  }
})();
