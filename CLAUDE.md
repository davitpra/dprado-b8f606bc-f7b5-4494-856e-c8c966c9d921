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
| `libs/data` | `@task-management/data` | Interfaces, enums (TaskStatus, TaskPriority, TaskCategory, UserRole), DTOs |
| `libs/auth` | `@task-management/auth` | Guards (JWT, Roles, Permissions), decorators (@CurrentUser, @Public, @Roles, @RequirePermission) |

### Database

- **Driver**: `better-sqlite3` via TypeORM (`@nestjs/typeorm ^11`)
- **Config via env**: `DATABASE_TYPE`, `DATABASE_URL` (path to `.db` file)
- **Status**: dependencies installed, `TypeOrmModule` not yet wired into `AppModule`

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

### Current State (scaffolding phase)

- `libs/data` interfaces are empty stubs — entities and DTOs not yet implemented
- `libs/auth` guards/decorators are empty stubs — JWT strategy not yet implemented
- `AppModule` has empty `imports: []` — no feature modules, no TypeOrmModule
- Angular `appRoutes` is empty — no pages yet

---

## Domain: Secure Task Management with RBAC

Full-stack coding assessment. Tasks are scoped to Departments within an Organization.

### Organizational Hierarchy

```
Organization
  └── Department 1 → users with roles (admin | viewer)
  └── Department 2 → users with roles (admin | viewer)
  Organization Owner → implicit full access, NOT stored in UserRole
```

### Data Model (7 entities)

| Entity | Key fields |
|--------|-----------|
| `Organization` | id, name, description, createdAt |
| `Department` | id, name, organizationId (FK) |
| `User` | id, email, password, firstName, lastName, organizationId (FK), **isOwner** (bool, default false) |
| `UserRole` | id, userId (FK), **role** (admin\|viewer), **departmentId** (FK) — dept-scoped only |
| `Task` | id, title, status, category, priority, **position** (drag-drop order), dueDate, createdById, assignedToId (nullable), departmentId, deletedAt (soft delete) |
| `Permission` | id, action (create\|read\|update\|delete\|invite), resource (task\|department\|user), role |
| `AuditLog` | id, action, resource, resourceId, userId, ipAddress, timestamp, details (JSON) |

### RBAC Access Check Flow

```
Is user Owner (isOwner = true)?
  → YES: grant full access to everything
  → NO: resolve UserRole for the specific department
        Admin? → full access to dept tasks/members
        Viewer? → ownership check → allow only on own tasks
```

- Owner has **no UserRole entries** — access is implicit and org-wide
- A user can be Admin in dept A and Viewer in dept B simultaneously
- Owner and dept-scoped roles are **mutually exclusive** (`isOwner=true` → no UserRole rows)
- Always evaluate the **highest privilege** the user holds for a given department

### RBAC Permissions Summary

| Action | Owner | Admin | Viewer |
|--------|-------|-------|--------|
| Create/edit/delete Department | ✅ | ❌ | ❌ |
| Invite user as Admin | ✅ | ❌ | ❌ |
| Invite user as Viewer | ✅ | ✅ (own dept) | ❌ |
| Create task | ✅ | ✅ (own dept) | ❌ |
| Read all tasks in dept | ✅ | ✅ (own dept) | ❌ |
| Read/edit/delete own tasks | ✅ | ✅ | ✅ (own dept) |
| View audit log | ✅ (all) | ✅ (own dept) | ❌ |

### API Endpoints

All endpoints except `/auth/*` require `Authorization: Bearer <token>`.

```
POST   /auth/register
POST   /auth/login          → { access_token, refresh_token }
POST   /auth/refresh

GET    /organizations/me

POST   /departments
GET    /departments
PUT    /departments/:id
DELETE /departments/:id

POST   /departments/:id/members    (Owner→admin|viewer, Admin→viewer only)
GET    /departments/:id/members
DELETE /departments/:id/members/:userId

POST   /tasks
GET    /tasks                      (Viewer sees only own tasks)
GET    /tasks/:id
PUT    /tasks/:id
PATCH  /tasks/:id/reorder
DELETE /tasks/:id                  (soft delete)

GET    /audit-log
```

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

| Email | Password | Role |
|-------|----------|------|
| owner@acme.com | Password123! | Organization Owner |
| admin.eng@acme.com | Password123! | Admin — Engineering |
| admin.mkt@acme.com | Password123! | Admin — Marketing |
| viewer1@acme.com | Password123! | Viewer — Engineering |
| viewer2@acme.com | Password123! | Viewer — Marketing |
| multi@acme.com | Password123! | Admin — Engineering + Viewer — Marketing |

Organization: **Acme Corp** | Departments: **Engineering**, **Marketing**

### Key Technical Decisions

- SQLite (`better-sqlite3`) for dev, PostgreSQL-ready via TypeORM (just swap driver + env)
- `isOwner` flag on User (not in UserRole) — Owner bypasses all permission checks
- `UserRole` pivot enables multi-role per user with department scoping
- Soft deletes on Task (`deletedAt`)
- Audit interceptor logs all CRUD actions automatically
- JWT access token (15m) + refresh token (7d) via Passport.js
