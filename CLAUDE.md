# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

---

# Project: Task Management Monorepo

Nx monorepo with a NestJS API backend and an Angular frontend. Package manager: **npm**.

## Common Commands

```bash
# Serve both apps in development
npx nx serve api          # NestJS API → http://localhost:3000/api
npx nx serve dashboard    # Angular    → http://localhost:4200

# Build
npx nx build api
npx nx build dashboard

# Test
npx nx test api
npx nx test dashboard
npx nx test data          # lib unit tests
npx nx test auth

# Run a single test file
npx nx test api --testFile=apps/api/src/app/app.service.spec.ts

# Lint
npx nx lint api
npx nx lint dashboard

# Run affected only (CI)
npx nx affected -t test
npx nx affected -t lint

# Seed database (idempotent — safe to re-run)
npm run seed
```

Swagger UI is available at `http://localhost:3000/api/docs` when the API is running.

## Architecture

### Apps

| App | Stack | Port |
|-----|-------|------|
| `apps/api` | NestJS 11 | 3000 |
| `apps/dashboard` | Angular 21 (standalone) | 4200 |

**API bootstrap** (`apps/api/src/main.ts`): global prefix `/api`, `ValidationPipe` (whitelist + transform), CORS origin `http://localhost:4200`, Swagger at `/api/docs`.

**Angular proxy**: all `/api/*` requests from the Angular dev server are proxied to `http://localhost:3000` via `apps/dashboard/proxy.conf.json`. No CORS config needed in development.

### Shared Libraries

| Library | Import path | Contents |
|---------|-------------|----------|
| `libs/data` | `@task-management/data` | Interfaces, enums (TaskStatus, TaskPriority, TaskCategory, UserRole) |
| `libs/data` | `@task-management/data/dto` | DTOs with class-validator/Swagger decorators (**API-only**, never import from dashboard) |
| `libs/auth` | `@task-management/auth` | Guards (JWT, Roles, Permissions), decorators (@CurrentUser, @Public, @Roles, @RequirePermission) |

### Database

- **Driver**: `better-sqlite3` via TypeORM (`@nestjs/typeorm ^11`)
- **Config via env**: `DATABASE_TYPE`, `DATABASE_URL` (path to `.db` file)
- `TypeOrmModule` is configured in `apps/api/src/app/database/database.module.ts` and imported by `AppModule`
- Tests use in-memory SQLite: `DATABASE_URL=':memory:'` (set in `apps/api/src/test-setup.ts`)

### Environment Variables

Copy `.env.example` → `.env`. Key variables:

```
PORT=3000
JWT_SECRET=...
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
DATABASE_TYPE=better-sqlite3
DATABASE_URL=./data/taskmanager.db
```

---

## Domain: Secure Task Management with RBAC

Full-stack coding assessment. Tasks are scoped to Departments within an Organization.

### Organizational Hierarchy

```
Organization
  └── Department 1 → users with roles (admin | viewer)
  └── Department 2 → users with roles (admin | viewer)
  Organization Owner → OWNER role in user_roles (departmentId = null), full access
```

### Data Model (7 entities)

| Entity | Key fields |
|--------|-----------|
| `Organization` | id, name, description, createdAt |
| `Department` | id, name, organizationId (FK) |
| `User` | id, email, password, firstName, lastName, organizationId (FK) |
| `UserRole` | id, userId (FK), **role** (owner\|admin\|viewer), **departmentId** (FK, nullable) — OWNER has departmentId=null (org-wide) |
| `Task` | id, title, status, category, priority, **position** (drag-drop order), dueDate, createdById, assignedToId (nullable), departmentId, deletedAt (soft delete) |
| `Permission` | id, action (create\|read\|update\|delete\|invite), resource (task\|department\|user), role |
| `AuditLog` | id, action, resource, resourceId, userId, ipAddress, timestamp, details (JSON) |

### RBAC Access Check Flow

```
Does user have OWNER role in user_roles (departmentId = null)?
  → YES: grant full access to everything
  → NO: resolve UserRole for the specific department
        Admin? → full access to dept tasks/members
        Viewer? → ownership check → allow only on own tasks
```

- OWNER is stored as a row in `user_roles` with `departmentId = null` (org-wide access)
- `user.isOwner` is a computed getter that checks for the OWNER role in the roles relation
- A user can be Admin in dept A and Viewer in dept B simultaneously
- OWNER and dept-scoped roles are **mutually exclusive** (OWNER role → no dept-scoped UserRole rows)
- Always evaluate the **highest privilege** the user holds for a given department

### RBAC Permissions Summary

| Action | Owner | Admin | Viewer |
|--------|-------|-------|--------|
| Create/edit/delete Department | ✅ | ❌ | ❌ |
| Invite user as Admin | ✅ | ❌ | ❌ |
| Invite user as Viewer | ✅ | ✅ (own dept) | ❌ |
| List department members | ✅ | ✅ (own dept) | ❌ |
| Remove member (Viewer only) | ✅ | ✅ (own dept) | ❌ |
| Update member role | ✅ | ❌ | ❌ |
| Create task | ✅ | ✅ (own dept) | ❌ |
| Read all tasks in dept | ✅ | ✅ (own dept) | ❌ |
| Read/edit/delete own tasks | ✅ | ✅ | ✅ (own dept) |
| Reorder tasks (kanban) | ✅ | ✅ (own dept) | ❌ |
| View audit log | ✅ (all) | ✅ (own dept) | ❌ |

### API Endpoints

All endpoints except `/auth/*` require `Authorization: Bearer <token>`.

```
POST   /auth/register
POST   /auth/login          → { access_token, refresh_token }
POST   /auth/refresh

GET    /organizations/me
GET    /organizations/me/users     (Owner, Admin)
POST   /organizations/me/users     (Owner only — create user in org)

POST   /departments
GET    /departments
PUT    /departments/:id
DELETE /departments/:id

POST   /departments/:id/members    (Owner→admin|viewer, Admin→viewer only)
GET    /departments/:id/members    (Owner, Admin only — Viewer: 403)
PUT    /departments/:id/members/:userId  (Owner only — update role)
DELETE /departments/:id/members/:userId  (Owner: anyone; Admin: Viewer only)

POST   /tasks
GET    /tasks                      (Viewer sees only own tasks)
GET    /tasks/:id
PUT    /tasks/:id
PATCH  /tasks/:id/reorder
DELETE /tasks/:id                  (soft delete)

GET    /audit-log
```

### Icons (ng-icons + Lucide)

Use `@ng-icons/core` with `@ng-icons/lucide` for all icons in the dashboard. Never use inline SVGs.

```typescript
// In component .ts
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff } from '@ng-icons/lucide';

@Component({
  imports: [NgIcon],
  providers: [provideIcons({ lucideEye, lucideEyeOff })],
})
```

```html
<!-- In template -->
<ng-icon name="lucideEye" size="20" />
```

Browse available icons at https://lucide.dev/icons

### Frontend Features

- Angular Signals for state management
- Kanban view (3 columns: Todo / In Progress / Done) + list view
- Drag-and-drop reorder between columns (Owner, Admin only) via Angular CDK
- Filters: search, status, category, priority; Sorting: date, priority, title
- Department management page (Owner only)
- Member management within dept (Owner, Admin)
- Audit log page
- Dark/light mode, responsive

### Seed Data (dev credentials)

**Acme Corp** — Departments: Engineering, Marketing, Design

| Email | Password | Role |
|-------|----------|------|
| owner@acme.com | Password123! | Owner |
| admin.eng@acme.com | Password123! | Admin — Engineering |
| admin.mkt@acme.com | Password123! | Admin — Marketing |
| admin.design@acme.com | Password123! | Admin — Design |
| viewer.eng@acme.com | Password123! | Viewer — Engineering |
| viewer.mkt@acme.com | Password123! | Viewer — Marketing |
| multi@acme.com | Password123! | Admin(Eng) + Viewer(Mkt) + Viewer(Design) |

**Globex Corp** — Departments: Product, Sales, Support

| Email | Password | Role |
|-------|----------|------|
| owner@globex.com | Password123! | Owner |
| admin.product@globex.com | Password123! | Admin — Product |
| admin.sales@globex.com | Password123! | Admin — Sales |
| admin.support@globex.com | Password123! | Admin — Support |
| viewer.product@globex.com | Password123! | Viewer — Product |
| viewer.sales@globex.com | Password123! | Viewer — Sales |
| multi@globex.com | Password123! | Admin(Sales) + Viewer(Product) + Viewer(Support) |

### Key Technical Decisions

- SQLite (`better-sqlite3`) for dev, PostgreSQL-ready via TypeORM (just swap driver + env)
- OWNER role stored in `user_roles` with `departmentId = null` — `user.isOwner` is a computed getter
- `UserRole` pivot enables multi-role per user with department scoping
- Soft deletes on Task (`deletedAt`)
- Audit interceptor logs all CRUD actions automatically
- JWT access token (15m) + refresh token (7d) via Passport.js

### API Testing

Integration tests use `@nestjs/testing` + `supertest` with an in-memory SQLite database (`:memory:`). ThrottlerGuard is disabled by overriding the throttler storage via `getStorageToken()` from `@nestjs/throttler`.

**315 tests across 17 spec files:**

| File | Tests | Focus |
|------|-------|-------|
| `apps/api/src/app/access-control/access-control.service.spec.ts` | 27 | Unit — RBAC logic (mocked repos) |
| `apps/api/src/app/access-control/permissions.guard.spec.ts` | 13 | Unit — PermissionsGuard (resolveDepartmentId, bypass, skip) |
| `apps/api/src/app/access-control/task-ownership.guard.spec.ts` | 12 | Unit — TaskOwnershipGuard (create/modify, cache, 404) |
| `apps/api/src/app/audit/audit.service.spec.ts` | 19 | Unit — AuditService log() + findAll() RBAC/filters/pagination |
| `apps/api/src/app/audit/audit.interceptor.spec.ts` | 30 | Unit — AuditInterceptor skip/action/resource/departmentId/access_denied |
| `apps/api/src/app/auth/auth.service.spec.ts` | 17 | Unit — AuthService register/login/refresh/validateToken |
| `apps/api/src/app/auth/jwt.strategy.spec.ts` | 2 | Unit — JwtStrategy validate() (found/not found) |
| `apps/api/src/app/departments/departments.service.spec.ts` | 14 | Unit — DepartmentsService CRUD (Owner-only guards, org scoping) |
| `apps/api/src/app/department-members/department-members.service.spec.ts` | 21 | Unit — DepartmentMembersService invite/findAll/remove/updateRole |
| `apps/api/src/app/organizations/organizations.service.spec.ts` | 8 | Unit — OrganizationsService getByUser/getUsersForOrg/createUser |
| `apps/api/src/app/tasks/tasks.service.spec.ts` | 34 | Unit — TasksService create/findAll/findOne/update/reorder/remove |
| `apps/api/src/test/auth.spec.ts` | 18 | Integration — Register, login, refresh, /me, JWT guard |
| `apps/api/src/test/tasks.spec.ts` | 32 | Integration — Full RBAC matrix × all task endpoints |
| `apps/api/src/test/departments.spec.ts` | 17 | Integration — Dept CRUD × Owner/Admin/Viewer |
| `apps/api/src/test/members.spec.ts` | 21 | Integration — Invite, list, update role, remove |
| `apps/api/src/test/organizations.spec.ts` | 11 | Integration — GET /me, POST /me/users, GET /me/users |
| `apps/api/src/test/audit.spec.ts` | 19 | Integration — GET /audit-log RBAC, Admin scoping, all filters, entry shape |

**Test infrastructure:**
- `apps/api/src/test-setup.ts` — sets env vars before any module import
- `apps/api/src/test/helpers/app.helper.ts` — `createTestApp()` builds a full NestJS test app
- `apps/api/src/test/helpers/seed.helper.ts` — `seedTestData()` + `getToken()` helpers
- `apps/api/jest.config.ts` — ts-jest with `module: commonjs`, moduleNameMapper for workspace libs
- `apps/api/tsconfig.spec.json` — overrides `module`, `moduleResolution`, `isolatedModules` for Jest

**Important:** Login endpoint has a 5 req/60s throttle. Tests obtain `ownerToken` in the outer `beforeAll` and reuse it across describes to stay within the limit.
