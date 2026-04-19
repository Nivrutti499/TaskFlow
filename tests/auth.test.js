const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../src/app');

const prisma = new PrismaClient();

// Unique email prefix per test run to avoid collisions
const timestamp = Date.now();

afterAll(async () => {
  // Clean up test users created during this run
  await prisma.user.deleteMany({
    where: { email: { contains: `test_${timestamp}` } },
  });
  await prisma.$disconnect();
});

describe('Auth API', () => {
  const validUser = {
    name: 'Test User',
    email: `test_${timestamp}@example.com`,
    password: 'Test@1234',
  };

  // ── Register ──────────────────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201 with token', async () => {
      const res = await request(app).post('/api/auth/register').send(validUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user.email).toBe(validUser.email.toLowerCase());
      // Password must never be exposed
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should return 400 when registering with a duplicate email', async () => {
      // Second registration with same email
      const res = await request(app).post('/api/auth/register').send(validUser);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: `missing_${timestamp}@example.com`,
        password: 'Test@1234',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.some((e) => e.field === 'name')).toBe(true);
    });

    it('should return 400 when password is too weak', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Weak Pass User',
        email: `weakpass_${timestamp}@example.com`,
        password: 'short',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
    });

    it('should return 400 when email format is invalid', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Bad Email',
        email: 'not-an-email',
        password: 'Test@1234',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials and return 200 with token', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(typeof res.body.data.token).toBe('string');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should return 401 when login with wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: 'WrongPass@999',
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it('should return 401 when login with non-existent email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'ghost@nowhere.com',
        password: 'Test@1234',
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when email is missing', async () => {
      const res = await request(app).post('/api/auth/login').send({
        password: 'Test@1234',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
