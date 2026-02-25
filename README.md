# Secure Task Management System

A full-stack task management application with Role-Based Access Control (RBAC), built as an NX monorepo with a NestJS API backend and Angular 21 frontend.

---

## Table of Contents

- [Setup Instructions](#setup-instructions)
- [Architecture Overview](#architecture-overview)
- [Data Model](#data-model)
- [Access Control Implementation](#access-control-implementation)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Bonus Features](#bonus-features)
- [Future Considerations](#future-considerations)
- [Tradeoffs & Notes](#tradeoffs--notes)

---

## Setup Instructions

### Prerequisites

- Node.js >= 20
- npm >= 10

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
NODE_ENV=development
PORT=3000

JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

DATABASE_TYPE=better-sqlite3
DATABASE_URL=./data/taskmanager.db
```

### 3. Seed the database

```bash
npm run seed
```

This creates two organizations (**Acme Corp** and **Globex Corp**), each with three departments, 7 users, and sample tasks. Safe to re-run (idempotent — skips if both organizations already exist).

**Acme Corp** — Departments: Engineering, Marketing, Design

| Email                 | Password     | Role                                                       |
| --------------------- | ------------ | ---------------------------------------------------------- |
| owner@acme.com        | Password123! | Owner                                                      |
| admin.eng@acme.com    | Password123! | Admin — Engineering                                        |
| admin.mkt@acme.com    | Password123! | Admin — Marketing                                          |
| admin.design@acme.com | Password123! | Admin — Design                                             |
| viewer.eng@acme.com   | Password123! | Viewer — Engineering                                       |
| viewer.mkt@acme.com   | Password123! | Viewer — Marketing                                         |
| multi@acme.com        | Password123! | Admin (Engineering) + Viewer (Marketing) + Viewer (Design) |

**Globex Corp** — Departments: Product, Sales, Support

| Email                     | Password     | Role                                                |
| ------------------------- | ------------ | --------------------------------------------------- |
| owner@globex.com          | Password123! | Owner                                               |
| admin.product@globex.com  | Password123! | Admin — Product                                     |
| admin.sales@globex.com    | Password123! | Admin — Sales                                       |
| admin.support@globex.com  | Password123! | Admin — Support                                     |
| viewer.product@globex.com | Password123! | Viewer — Product                                    |
| viewer.sales@globex.com   | Password123! | Viewer — Sales                                      |
| multi@globex.com          | Password123! | Admin (Sales) + Viewer (Product) + Viewer (Support) |

### 4. Run the applications

```bash
# API (http://localhost:3000/api)
npx nx serve api

# Angular dashboard (http://localhost:4200) — in a separate terminal
npx nx serve dashboard
```

- Swagger UI: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- Dashboard: [http://localhost:4200](http://localhost:4200)

The Angular dev server proxies all `/api/*` requests to `http://localhost:3000` — no CORS configuration needed.

---

## Architecture Overview

### Monorepo Layout

```
task-management/
├── apps/
│   ├── api/            NestJS 11 backend (port 3000)
│   └── dashboard/      Angular 21 frontend (port 4200)
├── libs/
│   ├── data/           Shared interfaces, enums, and DTOs
│   └── auth/           Reusable RBAC guards and decorators
├── .env.example
└── package.json
```

### Why NX?

- **Shared libraries** — `libs/data` and `libs/auth` are consumed by both apps with proper import paths (`@task-management/data`, `@task-management/auth`), eliminating duplication and keeping types in sync.
- **Affected commands** — `npx nx affected -t test` runs only tests impacted by a change, speeding up CI.
- **Consistent tooling** — single lint, test, and build pipeline across all projects.

### Shared Libraries

| Library     | Import path                 | Contents                                                                                                            |
| ----------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `libs/data` | `@task-management/data`     | TypeScript interfaces, enums (TaskStatus, TaskPriority, TaskCategory, UserRole)                                     |
| `libs/data` | `@task-management/data/dto` | DTOs with class-validator and Swagger decorators (**API-only** — never import from dashboard)                       |
| `libs/auth` | `@task-management/auth`     | Guards (JwtAuth, Roles, Permissions, TaskOwnership), decorators (@CurrentUser, @Public, @Roles, @RequirePermission) |

### Backend Modules

| Module                    | Responsibility                                          |
| ------------------------- | ------------------------------------------------------- |
| `AuthModule`              | JWT authentication, registration, login, refresh tokens |
| `DatabaseModule`          | TypeORM connection (SQLite dev / PostgreSQL-ready)      |
| `AccessControlModule`     | RBAC service, PermissionsGuard, TaskOwnershipGuard      |
| `OrganizationsModule`     | Org info, user listing, user creation (Owner only)      |
| `DepartmentsModule`       | Department CRUD (Owner only)                            |
| `DepartmentMembersModule` | Invite/remove/update members (Owner + Admin)            |
| `TasksModule`             | Task CRUD, reorder, filtering, pagination               |
| `AuditModule`             | Audit log writes (interceptor) and reads (controller)   |

### Frontend Architecture

Angular 21 standalone components with signal-based state management:

- **Stores** (`TaskStore`, `AuthStore`, `DepartmentStore`, `UIStore`) — global state via Angular signals, `providedIn: 'root'`
- **Features** — lazy-loaded route modules: `auth`, `tasks`, `departments`, `audit-log`
- **Auth interceptor** — automatically attaches `Authorization: Bearer <token>` to all API requests
- **Route guards** — `authGuard`, `ownerGuard`, `departmentAdminGuard`

---

## Data Model

### Entity Relationship Diagram

![ERM Diagram](./ERM%20Diagram.svg)

### Entities

#### Permission

| Column   | Type    | Notes                                             |
| -------- | ------- | ------------------------------------------------- |
| id       | UUID    | PK                                                |
| action   | varchar | create \| read \| update \| delete \| invite      |
| resource | varchar | task \| department \| user                        |
| role     | varchar | ADMIN \| VIEWER (OWNER bypasses permission table) |

#### Organization

| Column      | Type      | Notes    |
| ----------- | --------- | -------- |
| id          | UUID      | PK       |
| name        | varchar   |          |
| description | varchar   | nullable |
| createdAt   | timestamp |          |

#### Department

| Column         | Type      | Notes             |
| -------------- | --------- | ----------------- |
| id             | UUID      | PK                |
| name           | varchar   |                   |
| description    | varchar   | nullable          |
| organizationId | UUID      | FK → Organization |
| createdAt      | timestamp |                   |

#### User

| Column         | Type      | Notes                                                 |
| -------------- | --------- | ----------------------------------------------------- |
| id             | UUID      | PK                                                    |
| email          | varchar   | unique                                                |
| password       | varchar   | bcrypt (12 rounds), excluded from responses           |
| firstName      | varchar   |                                                       |
| lastName       | varchar   |                                                       |
| organizationId | UUID      | FK → Organization                                     |
| createdAt      | timestamp |                                                       |
| **isOwner**    | computed  | getter — checks for OWNER role with departmentId=null |

#### UserRole (pivot)

| Column       | Type | Notes                                              |
| ------------ | ---- | -------------------------------------------------- |
| id           | UUID | PK                                                 |
| userId       | UUID | FK → User (cascade delete)                         |
| role         | enum | OWNER \| ADMIN \| VIEWER                           |
| departmentId | UUID | FK → Department (nullable — null = org-wide OWNER) |

Unique constraint: `[userId, departmentId]`

#### Task

| Column       | Type      | Notes                                     |
| ------------ | --------- | ----------------------------------------- |
| id           | UUID      | PK                                        |
| title        | varchar   |                                           |
| description  | text      | nullable                                  |
| status       | enum      | TODO \| IN_PROGRESS \| DONE               |
| category     | enum      | WORK \| PERSONAL                          |
| priority     | enum      | LOW \| MEDIUM \| HIGH                     |
| position     | integer   | drag-drop ordering within a status column |
| dueDate      | varchar   | ISO 8601 string, nullable                 |
| createdById  | UUID      | FK → User                                 |
| assignedToId | UUID      | FK → User, nullable                       |
| departmentId | UUID      | FK → Department                           |
| createdAt    | timestamp |                                           |
| updatedAt    | timestamp |                                           |
| deletedAt    | timestamp | soft delete — null when active            |

#### AuditLog

| Column     | Type      | Notes                       |
| ---------- | --------- | --------------------------- |
| id         | UUID      | PK                          |
| action     | varchar   | e.g. CREATE, UPDATE, DELETE |
| resource   | varchar   | e.g. task, department       |
| resourceId | varchar   |                             |
| userId     | UUID      | FK → User                   |
| ipAddress  | varchar   |                             |
| details    | json      | request/response metadata   |
| timestamp  | timestamp | indexed                     |

---

## Access Control Implementation

### Role Hierarchy

```
Organization
  └── Owner      → org-wide, stored as UserRole with departmentId = null
  └── Department A
        └── Admin  → full access within dept A
        └── Viewer → read-only own tasks within dept A
  └── Department B
        └── Admin  → full access within dept B
```

- A user can be Admin in dept A and Viewer in dept B simultaneously.
- OWNER and department-scoped roles are mutually exclusive.
- The `user.isOwner` computed getter checks for a `UserRole` row with `role = OWNER` and `departmentId = null`.

### RBAC Decision Flow

```
1st Layer JwtAuthGuard

A[Request arrives] --> B[JwtAuthGuard --> Validate token --> Load user + roles]

B --> C{Route is @Public()?}

C -->|YES| ALLOW1[✅ Allow Request]
C -->|NO| D[PermissionsGuard]

2nd Layer Permission Guard

D --> E{User is Organization Owner?}

E -->|YES| ALLOW2[✅ Allow Request]
E -->|NO| F[Resolve departmentId from params/body/query]

F --> G{departmentId found?}

G -->|NO| DENY1[❌ 403 Forbidden]
G -->|YES| H[Find UserRole\n(userId + departmentId)]

H --> I{UserRole exists?}

I -->|NO| DENY2[❌ 403 Forbidden]
I -->|YES| J[Check Permission\n(action, resource, role)]

J --> K{Permission exists?}

K -->|NO| DENY3[❌ 403 Forbidden]
K -->|YES| L{Is operation UPDATE or DELETE on owned resource?}

L -->|NO| ALLOW3[✅ Allow Request]
L -->|YES| M[TaskOwnershipGuard]

3rd Layer TaskOwnershipGuard

M --> N{Role is Admin?}

N -->|YES| ALLOW4[✅ Allow Request]
N -->|NO| O{Role is Viewer AND owns resource?}

O -->|YES| ALLOW5[✅ Allow Request]
O -->|NO| DENY4[❌ 403 Forbidden]
```

### RBAC Permissions Matrix

| Action                        |  Owner   |     Admin     |    Viewer     |
| ----------------------------- | :------: | :-----------: | :-----------: |
| Create/edit/delete Department |    ✅    |      ❌       |      ❌       |
| Invite user as Admin          |    ✅    |      ❌       |      ❌       |
| Invite user as Viewer         |    ✅    | ✅ (own dept) |      ❌       |
| List department members       |    ✅    | ✅ (own dept) |      ❌       |
| Remove Viewer from dept       |    ✅    | ✅ (own dept) |      ❌       |
| Update member role            |    ✅    |      ❌       |      ❌       |
| Create task                   |    ✅    | ✅ (own dept) |      ❌       |
| Read all tasks in dept        |    ✅    | ✅ (own dept) |      ❌       |
| Read/edit/delete own tasks    |    ✅    |      ✅       | ✅ (own dept) |
| Reorder tasks (kanban)        |    ✅    | ✅ (own dept) | ✅ (own dept) |
| View audit log                | ✅ (all) | ✅ (own dept) |      ❌       |

### JWT Integration

1. `POST /api/auth/login` returns `{ access_token, refresh_token }`.
2. `access_token` (15 min) is a signed JWT containing `{ sub: userId, email, isOwner }`.
3. `JwtAuthGuard` (registered as global `APP_GUARD`) validates every request automatically. Routes opt out via `@Public()`.
4. `JwtStrategy.validate()` loads the full `User` entity (with roles relation) from the DB on each request, making up-to-date role data available to downstream guards.
5. `POST /api/auth/refresh` exchanges the `refresh_token` (7 days) for a new `access_token` without re-login.

---

## API Documentation

All endpoints except `/api/auth/*` require `Authorization: Bearer <access_token>`.

Interactive Swagger UI: `http://localhost:3000/api/docs`

### Authentication

| Method | Path                 | Auth   | Description                         |
| ------ | -------------------- | ------ | ----------------------------------- |
| POST   | `/api/auth/register` | Public | Register user + create organization |
| POST   | `/api/auth/login`    | Public | Login (5 req/60s throttle)          |
| POST   | `/api/auth/refresh`  | Public | Refresh access token                |
| GET    | `/api/auth/me`       | JWT    | Current user profile + roles        |

**Login request/response:**

```json
// POST /api/auth/login
{ "email": "owner@acme.com", "password": "Password123!" }

// 201 Created
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci..."
}
```

### Organizations

| Method | Path                          | Auth                 | Description                           |
| ------ | ----------------------------- | -------------------- | ------------------------------------- |
| GET    | `/api/organizations/me`       | Owner, Admin, Viewer | Get own organization + departments    |
| GET    | `/api/organizations/me/users` | Owner, Admin         | List all users in the organization    |
| POST   | `/api/organizations/me/users` | Owner                | Create a new user in the organization |

### Departments

| Method | Path                   | Auth                 | Description                       |
| ------ | ---------------------- | -------------------- | --------------------------------- |
| POST   | `/api/departments`     | Owner                | Create department                 |
| GET    | `/api/departments`     | Owner, Admin, Viewer | List departments (scoped by role) |
| PUT    | `/api/departments/:id` | Owner                | Update department                 |
| DELETE | `/api/departments/:id` | Owner                | Delete department (204)           |

### Department Members

| Method | Path                                   | Auth                                       | Description        |
| ------ | -------------------------------------- | ------------------------------------------ | ------------------ |
| POST   | `/api/departments/:id/members`         | Owner (admin\|viewer), Admin (viewer only) | Invite user        |
| GET    | `/api/departments/:id/members`         | Owner, Admin                               | List members       |
| PUT    | `/api/departments/:id/members/:userId` | Owner                                      | Update member role |
| DELETE | `/api/departments/:id/members/:userId` | Owner (anyone), Admin (Viewer only)        | Remove member      |

**Invite request:**

```json
// POST /api/departments/dept-uuid/members
{ "userId": "user-uuid", "role": "viewer" }
```

### Tasks

| Method | Path                     | Auth                       | Description                          |
| ------ | ------------------------ | -------------------------- | ------------------------------------ |
| POST   | `/api/tasks`             | Owner, Admin               | Create task                          |
| GET    | `/api/tasks`             | Owner, Admin, Viewer       | List tasks (RBAC scoped, filterable) |
| GET    | `/api/tasks/:id`         | Owner, Admin, Viewer       | Get task by ID                       |
| PUT    | `/api/tasks/:id`         | Owner, Admin, Viewer (own) | Update task                          |
| PATCH  | `/api/tasks/:id/reorder` | Owner, Admin               | Move/reorder task                    |
| DELETE | `/api/tasks/:id`         | Owner, Admin, Viewer (own) | Soft-delete task                     |

**Create task request:**

```json
// POST /api/tasks
{
  "title": "Fix login bug",
  "description": "Optional description",
  "status": "todo",
  "priority": "high",
  "category": "work",
  "departmentId": "dept-uuid",
  "assignedToId": "user-uuid",
  "dueDate": "2025-12-31"
}
```

**List tasks with filters:**

```
GET /api/tasks?departmentId=uuid&status=todo&priority=high&search=login&page=1&limit=20
```

**Reorder task:**

```json
// PATCH /api/tasks/:id/reorder
{ "status": "in_progress", "position": 2 }
```

### Audit Log

| Method | Path             | Auth                                        | Description      |
| ------ | ---------------- | ------------------------------------------- | ---------------- |
| GET    | `/api/audit-log` | Owner (all), Admin (own dept), Viewer (403) | Query audit logs |

```
GET /api/audit-log?resource=task&action=CREATE&userId=uuid&from=2025-01-01&to=2025-12-31&page=1&limit=50
```

---

## Testing

### Run all tests

```bash
# API (unit + integration)
npx nx test api

# Dashboard (unit)
npx nx test dashboard

# Shared libraries
npx nx test data
npx nx test auth

# All affected tests
npx nx affected -t test
```

### Run a single spec file

```bash
npx nx test api --testFile=apps/api/src/test/tasks.spec.ts
```

### Test Coverage

**API — 315 tests across 17 spec files:**

| File                                 | Tests | Type                                |
| ------------------------------------ | ----: | ----------------------------------- |
| `access-control.service.spec.ts`     |    27 | Unit — RBAC logic                   |
| `permissions.guard.spec.ts`          |    13 | Unit — PermissionsGuard             |
| `task-ownership.guard.spec.ts`       |    12 | Unit — TaskOwnershipGuard           |
| `audit.service.spec.ts`              |    19 | Unit — AuditService                 |
| `audit.interceptor.spec.ts`          |    30 | Unit — AuditInterceptor             |
| `auth.service.spec.ts`               |    17 | Unit — AuthService                  |
| `jwt.strategy.spec.ts`               |     2 | Unit — JwtStrategy                  |
| `departments.service.spec.ts`        |    14 | Unit — DepartmentsService           |
| `department-members.service.spec.ts` |    21 | Unit — DepartmentMembersService     |
| `organizations.service.spec.ts`      |     8 | Unit — OrganizationsService         |
| `tasks.service.spec.ts`              |    34 | Unit — TasksService                 |
| `auth.spec.ts`                       |    18 | Integration — Auth endpoints        |
| `tasks.spec.ts`                      |    32 | Integration — Full RBAC task matrix |
| `departments.spec.ts`                |    17 | Integration — Dept CRUD             |
| `members.spec.ts`                    |    21 | Integration — Member management     |
| `organizations.spec.ts`              |    11 | Integration — Org endpoints         |
| `audit.spec.ts`                      |    19 | Integration — Audit log RBAC        |

Integration tests use `@nestjs/testing` + `supertest` with an **in-memory SQLite** database (`:memory:`), so no external database is needed.

**Dashboard — 417 tests across 35 suites** covering stores, services, guards, components, interceptors, and pipes.

---

## Bonus Features

All bonus features from the assessment have been implemented:

- **Dark/light mode** — system preference detection with manual toggle, persisted to localStorage.
- **Keyboard shortcuts** — `N` (new task), `/` (focus search), `?` (shortcuts help), `Esc` (close modal).
- **Task completion visualization** — stats bar showing task counts by status (Todo / In Progress / Done) with percentages.
- **JWT refresh tokens** — 15m access token + 7d refresh token, transparent refresh in the Angular auth interceptor.

---

## Future Considerations

### Advanced Role Delegation

- Allow Admins to promote Viewers without Owner intervention.
- Time-limited role assignments (e.g., temporary admin access).

### Production-Ready Security

- **HttpOnly cookie storage for JWT** — move the access token from `localStorage`/memory to an `HttpOnly; Secure; SameSite=Strict` cookie so it is inaccessible to JavaScript, eliminating XSS token-theft risk. The refresh token should be stored the same way.
- **CSRF protection** — a direct consequence of the above: once the JWT lives in a cookie the browser sends it automatically on every request, reopening the CSRF attack surface. Mitigate with a synchronizer token (`@nestjs/csrf` / `csurf`) or the `SameSite=Strict` cookie attribute, which blocks cross-origin requests from carrying the cookie at all.
- **RBAC caching** — cache permission lookups in Redis to avoid repeated DB queries on every request.
- **Rate limiting** — per-user rate limits (currently global via `@nestjs/throttler`).
- **Helmet** — add HTTP security headers.
- **Audit log retention** — automated pruning or archiving of old audit entries.

### Scalability

- **PostgreSQL** — swap `better-sqlite3` for `pg` driver by updating `DATABASE_TYPE` env var; TypeORM abstracts the rest.
- **Efficient permission checks** — replace DB lookups with an in-memory permission graph, rebuilt on role changes.
- **Pagination cursors** — replace offset pagination with cursor-based pagination for large task lists.

---

## Tradeoffs & Notes

- **SQLite in development** — chosen for zero-config local setup. The TypeORM abstraction makes switching to PostgreSQL trivial (env var only).
- **`synchronize: true` in dev** — TypeORM auto-creates tables on startup. Production deployments would use migration files instead.
- **Position-based ordering** — task reorder updates all affected positions in a single transaction. At scale, fractional indexing (e.g., Lexorank) would reduce write amplification.
- **Soft deletes** — tasks use `deletedAt` (TypeORM `@DeleteDateColumn`). Deleted tasks are invisible in all queries by default but remain in the database for audit trail purposes.
- **Permission table** — Permissions are stored as data rows rather than hardcoded in guards. This allows future runtime configuration without code changes.
