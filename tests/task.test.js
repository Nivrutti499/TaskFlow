const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const app = require('../src/app');

const prisma = new PrismaClient();

let adminToken;
let managerToken;
let employeeToken;
let adminUser;
let managerUser;
let employeeUser;
let createdTaskId;

const ts = Date.now();

beforeAll(async () => {
  // Create test users directly in DB
  const hashed = await bcrypt.hash('Test@1234', 10);

  adminUser = await prisma.user.create({
    data: { name: 'Test Admin', email: `admin_${ts}@test.com`, password: hashed, role: 'ADMIN' },
  });

  managerUser = await prisma.user.create({
    data: { name: 'Test Manager', email: `manager_${ts}@test.com`, password: hashed, role: 'MANAGER' },
  });

  employeeUser = await prisma.user.create({
    data: { name: 'Test Employee', email: `employee_${ts}@test.com`, password: hashed, role: 'EMPLOYEE' },
  });

  // Get tokens via login
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: adminUser.email, password: 'Test@1234' });
  adminToken = adminLogin.body.data.token;

  const managerLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: managerUser.email, password: 'Test@1234' });
  managerToken = managerLogin.body.data.token;

  const employeeLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: employeeUser.email, password: 'Test@1234' });
  employeeToken = employeeLogin.body.data.token;
});

afterAll(async () => {
  // Cleanup test data
  if (createdTaskId) {
    await prisma.auditLog.deleteMany({ where: { taskId: createdTaskId } });
    await prisma.task.deleteMany({ where: { id: createdTaskId } });
  }
  await prisma.auditLog.deleteMany({ where: { userId: { in: [adminUser.id, managerUser.id, employeeUser.id] } } });
  await prisma.user.deleteMany({
    where: { id: { in: [adminUser.id, managerUser.id, employeeUser.id] } },
  });
  await prisma.$disconnect();
});

describe('Tasks API', () => {
  // ── Create Task ───────────────────────────────────────────────────────────

  describe('POST /api/tasks', () => {
    it('MANAGER can create a task → 201', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Test Task for Unit Tests',
          description: 'This task is created during testing',
          priority: 'HIGH',
          assignedTo: employeeUser.id,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task).toHaveProperty('id');
      expect(res.body.data.task.title).toBe('Test Task for Unit Tests');
      expect(res.body.data.task.status).toBe('TODO');
      expect(res.body.data.task.assignedTo.id).toBe(employeeUser.id);

      createdTaskId = res.body.data.task.id;
    });

    it('EMPLOYEE cannot create a task → 403', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ title: 'Sneaky task', priority: 'LOW' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 when no token provided', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'No auth task' });

      expect(res.statusCode).toBe(401);
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ priority: 'LOW' });

      expect(res.statusCode).toBe(400);
      expect(res.body.errors.some((e) => e.field === 'title')).toBe(true);
    });
  });

  // ── List Tasks ────────────────────────────────────────────────────────────

  describe('GET /api/tasks', () => {
    it('ADMIN can list all tasks with pagination', async () => {
      const res = await request(app)
        .get('/api/tasks?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('tasks');
      expect(res.body.data).toHaveProperty('pagination');
      expect(res.body.data.pagination).toHaveProperty('total');
    });

    it('EMPLOYEE can only see their own tasks', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.statusCode).toBe(200);
      // All tasks in response should belong to employee
      res.body.data.tasks.forEach((task) => {
        expect(task.userId).toBe(employeeUser.id);
      });
    });
  });

  // ── Get Task By ID ────────────────────────────────────────────────────────

  describe('GET /api/tasks/:id', () => {
    it('MANAGER can get a task by ID', async () => {
      const res = await request(app)
        .get(`/api/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.task.id).toBe(createdTaskId);
    });

    it('returns 404 for non-existent task ID', async () => {
      const res = await request(app)
        .get('/api/tasks/nonexistentid12345')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // ── Update Task ───────────────────────────────────────────────────────────

  describe('PATCH /api/tasks/:id', () => {
    it('EMPLOYEE can update status of their own task', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.task.status).toBe('IN_PROGRESS');
    });

    it('EMPLOYEE cannot change title of a task (only status allowed)', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ title: 'Hacked Title' });

      expect(res.statusCode).toBe(403);
    });

    it('audit log is created after task update', async () => {
      // Update the task as manager
      await request(app)
        .patch(`/api/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'DONE', priority: 'LOW' });

      // Check DB for audit log
      const logs = await prisma.auditLog.findMany({
        where: { taskId: createdTaskId, action: 'UPDATED' },
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('UPDATED');
      expect(logs[0].changes).not.toBeNull();
    });
  });

  // ── Delete Task ───────────────────────────────────────────────────────────

  describe('DELETE /api/tasks/:id', () => {
    it('EMPLOYEE cannot delete a task → 403', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('ADMIN can delete a task → 200', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      createdTaskId = null; // Mark as deleted so afterAll skips cleanup
    });
  });
});
