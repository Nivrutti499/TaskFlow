# TaskFlow API 🚀

A production-ready **Task Manager REST API** built with Node.js + Express, featuring JWT authentication, Role-Based Access Control, audit logging, and one-click Vercel deployment.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-purple.svg)](https://prisma.io)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 1. Project Overview & Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (HTTP)                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Serverless Edge                        │
│                    api/index.js (entry)                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────▼───────────────┐
          │         src/app.js            │
          │   helmet · cors · morgan      │
          │   rate-limit · swagger        │
          └───────────────┬───────────────┘
                          │
          ┌───────────────▼───────────────────────────────┐
          │              API Routes                        │
          │  /api/auth  /api/users  /api/tasks  /api/audit │
          └───────┬─────────┬──────────┬──────────┬────────┘
                  │         │          │          │
          ┌───────▼─┐ ┌─────▼──┐ ┌────▼──┐ ┌────▼───┐
          │  Auth   │ │ Users  │ │ Tasks │ │ Audit  │
          │Controller│ │Ctrl   │ │ Ctrl  │ │ Ctrl   │
          └───────┬─┘ └─────┬──┘ └────┬──┘ └────┬───┘
                  │         │          │          │
          ┌───────▼─────────▼──────────▼──────────▼────────┐
          │            Prisma ORM (PrismaClient)            │
          └─────────────────────┬───────────────────────────┘
                                │
          ┌─────────────────────▼───────────────────────────┐
          │         PostgreSQL (Railway / Supabase)          │
          │     users · tasks · audit_logs                   │
          └─────────────────────────────────────────────────┘
```

### Middleware Pipeline (per request)

```
Request → Helmet → CORS → Morgan → RateLimiter
       → Router → authenticateToken → authorizeRole
       → Zod Validation → Controller → Prisma → DB
       → Response
```

---

## 2. Tech Stack

| Technology | Version | Why We Chose It |
|---|---|---|
| **Node.js** | 18+ | LTS, native async support, Vercel-compatible |
| **Express.js** | 4.x | Minimal, flexible, massive ecosystem |
| **PostgreSQL** | 15+ | ACID-compliant, relational, free tier on Railway/Supabase |
| **Prisma** | 5.x | Type-safe queries, auto-migrations, great DX |
| **JWT** | — | Stateless, scalable auth — no session store needed |
| **bcryptjs** | — | Pure-JS bcrypt, Vercel-compatible (no native bindings) |
| **Zod** | 3.x | TypeScript-first validation, superior error messages |
| **Swagger UI** | — | OpenAPI 3.0 interactive docs auto-generated from JSDoc |
| **Jest + Supertest** | — | Integration tests against real Express app |
| **express-rate-limit** | 7.x | Simple, memory-based rate limiting |
| **Vercel** | — | Zero-config Node.js serverless, free tier |

---

## 3. Setup Instructions

### Prerequisites
- Node.js 18+
- A PostgreSQL database (Railway or Supabase free tier recommended)

### Clone & Install

```bash
git clone https://github.com/your-username/taskflow-api.git
cd taskflow-api
npm install
```

### Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
JWT_SECRET=at_least_64_chars_of_random_secret
PORT=3000
NODE_ENV=development
```

### Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations (creates tables)
npm run prisma:migrate

# Seed with sample data
npm run prisma:seed
```

### Start Dev Server

```bash
npm run dev
```

API will be running at `http://localhost:3000`  
Swagger docs at `http://localhost:3000/api/docs`  
Health check at `http://localhost:3000/health`

---

## 4. API Endpoints

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register a new user |
| POST | `/api/auth/login` | ❌ | Login and get JWT token |

### Users

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/api/users/me` | ✅ | All | Get own profile |
| PATCH | `/api/users/me` | ✅ | All | Update name or password |

### Tasks

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST | `/api/tasks` | ✅ | ADMIN, MANAGER | Create new task |
| GET | `/api/tasks` | ✅ | All | List tasks (paginated) |
| GET | `/api/tasks/:id` | ✅ | All | Get single task |
| PATCH | `/api/tasks/:id` | ✅ | All | Update task |
| DELETE | `/api/tasks/:id` | ✅ | ADMIN, MANAGER | Delete task |

**Task Query Params:**
```
GET /api/tasks?status=TODO&priority=HIGH&assignedTo=<userId>&page=1&limit=10
```

### Audit

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/api/audit` | ✅ | ADMIN | Get paginated audit logs |

**Audit Query Params:**
```
GET /api/audit?page=1&limit=20&userId=<id>&taskId=<id>&action=UPDATED
```

---

## 5. RBAC Permissions Table

| Action | ADMIN | MANAGER | EMPLOYEE |
|--------|:-----:|:-------:|:--------:|
| Register / Login | ✅ | ✅ | ✅ |
| View own profile | ✅ | ✅ | ✅ |
| Update own profile | ✅ | ✅ | ✅ |
| Create task | ✅ | ✅ | ❌ |
| View all tasks | ✅ | ✅ | ❌ (own only) |
| View own tasks | ✅ | ✅ | ✅ |
| Update any task | ✅ | ✅ | ❌ |
| Update own task status | ✅ | ✅ | ✅ |
| Delete task | ✅ | ✅ | ❌ |
| View audit logs | ✅ | ❌ | ❌ |

---

## 6. How Audit Logging Works

Every **create**, **update**, and **delete** action on tasks automatically writes a record to the `audit_logs` table.

### AuditLog Record Format

```json
{
  "id": "clxyz789ghi",
  "userId": "clxyz123abc",
  "user": { "name": "Alice Admin", "email": "admin@taskflow.com" },
  "taskId": "clxyz456def",
  "task": { "title": "Design landing page" },
  "action": "UPDATED",
  "changes": {
    "before": { "status": "TODO", "priority": "LOW" },
    "after":  { "status": "IN_PROGRESS", "priority": "HIGH" }
  },
  "createdAt": "2025-06-15T10:30:00.000Z"
}
```

### Diff Algorithm

The `computeDiff(before, after)` utility in `src/utils/auditLogger.js`:
- Compares all fields between old and new task objects
- Returns only the changed fields in `before` and `after` keys
- Ignores internal fields (`id`, `createdAt`, `updatedAt`)

---

## 7. Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test file
npx jest tests/auth.test.js --verbose
npx jest tests/task.test.js --verbose
```

### Test Coverage

| Suite | Tests |
|-------|-------|
| `auth.test.js` | Register (valid, duplicate, invalid fields), Login (valid, wrong password, missing fields) |
| `task.test.js` | Create (MANAGER ✅, EMPLOYEE ❌), List (pagination, EMPLOYEE filter), Update (status, RBAC), Delete (EMPLOYEE ❌, ADMIN ✅), Audit log on update |

> ⚠️ Tests require a live PostgreSQL database. Set `DATABASE_URL` in `.env` before running.

---

## 8. Deployment to Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: TaskFlow API"
git remote add origin https://github.com/your-username/taskflow-api.git
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Vercel auto-detects `vercel.json`

### Step 3: Add Environment Variables

In Vercel Project Settings → **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Railway/Supabase connection string |
| `JWT_SECRET` | Your secret key (64+ chars) |
| `NODE_ENV` | `production` |

### Step 4: Run Prisma Migrations

Before first deployment, run from your local machine:

```bash
DATABASE_URL=<your-prod-db-url> npx prisma migrate deploy
DATABASE_URL=<your-prod-db-url> npm run prisma:seed
```

### Step 5: Deploy

Push any commit to `main` — Vercel auto-deploys.

```
https://your-taskflow-api.vercel.app/api/docs   ← Swagger UI
https://your-taskflow-api.vercel.app/health      ← Health check
```

---

## 9. Tradeoffs & Design Decisions

### Prisma over Raw SQL
Prisma provides a type-safe query builder, automatic migration management, and an intuitive schema DSL. Raw SQL would require manual migration files, no type safety, and more boilerplate. For a project this size, Prisma's DX advantages far outweigh its small runtime overhead.

### JWT over Sessions
Sessions require a shared session store (Redis, DB) which adds infrastructure complexity and doesn't work cleanly in stateless serverless environments like Vercel. JWT tokens are self-contained — the server validates them in memory with no DB lookup per request, making them ideal for distributed/serverless deployments.

### Zod over Joi
Zod is TypeScript-first (excellent IDE inference), has a cleaner chainable API, produces better error messages by default, and integrates with tRPC/other modern tooling. Joi is more mature but uses a callback-style API and requires more boilerplate for similar validations.

### Railway/Supabase over Self-Hosted Postgres
Both offer generous free tiers, managed backups, automatic scaling, and SSL — removing all operational overhead. Self-hosted Postgres requires a VPS, manual backups, security hardening, and uptime monitoring, which is overkill for development and small production workloads.

### bcryptjs over bcrypt (native)
`bcryptjs` is a pure JavaScript implementation that works everywhere without native build tools. Native `bcrypt` requires node-gyp compilation which can fail in Vercel's build environment. For the salt round count used (10), the performance difference is negligible.

---

## Seed Credentials

After running `npm run prisma:seed`:

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@taskflow.com | Admin@1234 |
| MANAGER | manager1@taskflow.com | Manager@1234 |
| MANAGER | manager2@taskflow.com | Manager@5678 |
| EMPLOYEE | employee1@taskflow.com | Emp@1111 |
| EMPLOYEE | employee2@taskflow.com | Emp@2222 |

---

## Response Format

All endpoints return consistent JSON:

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Error:**
```json
{ "success": false, "message": "...", "errors": [{ "field": "...", "message": "..." }] }
```

---

## License

MIT © TaskFlow
