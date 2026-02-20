# Project Brief: Secure Task Management System

## What is this?

I'm building a **Secure Task Management System** with Role-Based Access Control (RBAC) as a Full Stack coding assessment for TurboVets.

## Tech Stack

- **Monorepo:** NX Workspace
- **Backend:** NestJS + TypeORM + SQLite (dev) / PostgreSQL (prod)
- **Frontend:** Angular + TailwindCSS + Angular CDK (drag-and-drop)
- **Auth:** JWT (access + refresh tokens) with Passport.js
- **State Management:** Angular Signals
- **Testing:** Jest (backend + frontend)

## Monorepo Structure

```
apps/
  api/           → NestJS backend
  dashboard/     → Angular frontend
libs/
  data/          → Shared TypeScript interfaces, DTOs, and enums
  auth/          → Reusable RBAC guards, decorators, and strategies
```

## Organizational Hierarchy

```
Organization (top level)
  └── Department 1
  │     ├── User A (admin)
  │     ├── User B (viewer)
  │     └── User C (viewer)
  └── Department 2
        ├── User D (admin)
        └── User E (viewer)

  Organization Owner: User X (global access)
```

- An **Organization** is the top-level entity. It contains multiple Departments.
- A **Department** is the second level. It belongs to one Organization. Tasks are scoped to a Department.
- A **User** belongs to an Organization and can be assigned to one or more Departments with different roles in each.
- A User can hold **multiple roles** simultaneously (e.g., Admin in Department 1, Viewer in Department 2, **but not Organization Owner**).
- The **Organization Owner** is a separate designation — a user is either the org owner OR has department-scoped roles, not both.

## Data Model

Seven entities:

- **Organization** — id, name, description, createdAt
- **Department** — id, name, description, organizationId (FK → Organization), createdAt
- **User** — id, email, password, firstName, lastName, organizationId (FK → Organization), isOwner (boolean, default false), createdAt
- **UserRole** (pivot table) — id, userId (FK → User), role (enum: admin | viewer), departmentId (FK → Department, required). Only department-scoped roles; Owner is stored as `isOwner` flag on User.
- **Task** — id, title, description, status (todo | in_progress | done), category (work | personal), priority (low | medium | high), position (for drag-drop ordering), dueDate, createdById (FK → User), assignedToId (FK → User, nullable), departmentId (FK → Department), createdAt, updatedAt, deletedAt
- **Permission** — id, action (create | read | update | delete | invite), resource (task | department | user), role (admin | viewer). Note: Owner bypasses permission checks entirely (has implicit full access).
- **AuditLog** — id, action, resource, resourceId, userId (FK → User), ipAddress, timestamp, details (JSON)

### Entity Relationships

```
Organization ||--o{ Department : "has many"
Organization ||--o{ User : "has many"
Department ||--o{ Task : "contains"
Department ||--o{ UserRole : "scoped to"
User ||--o{ UserRole : "has many"
User ||--o{ Task : "creates"
User ||--o{ Task : "assigned to"
User ||--o{ AuditLog : "generates"
```

## Roles & Permissions

### Organization Owner (`isOwner = true`)

The owner has **full control** over the entire organization.

- ✅ Create, edit, and delete **Departments**
- ✅ Invite users to any Department as **admin** or **viewer**
- ✅ Remove users from any Department
- ✅ View, create, edit, and delete **all tasks** across all Departments
- ✅ View audit logs
- ✅ Manage organization settings
- A User is an Owner when `user.isOwner = true` (NOT stored in UserRole table)
- An Owner does NOT have entries in the UserRole table — their access is implicit and org-wide

### Department Admin (`admin`)

An admin manages **only their assigned Department(s)**.

- ✅ Invite users to **their Department** as **viewer** (not as admin or owner)
- ✅ Remove viewers from **their Department**
- ✅ View, create, edit, and delete **all tasks** within their Department
- ✅ View audit logs of their Department
- ❌ Cannot access tasks or users from other Departments (unless also assigned there)
- ❌ Cannot create or delete Departments
- ❌ Cannot invite admins (only the Owner can)
- A User is an Admin when they have a UserRole with `role = "admin"` and `departmentId = {specific dept}`

### Viewer (`viewer`)

A viewer has **limited access** to their own tasks only.

- ✅ View **only their own tasks** within their assigned Department(s)
- ✅ Edit **only their own tasks**
- ✅ Delete **only their own tasks**
- ❌ Cannot view other users' tasks
- ❌ Cannot create tasks
- ❌ Cannot invite anyone
- ❌ Cannot view audit logs
- A User is a Viewer when they have a UserRole with `role = "viewer"` and `departmentId = {specific dept}`

### Permissions Matrix

| Action                  | Owner    | Dept Admin                  | Viewer        |
| ----------------------- | -------- | --------------------------- | ------------- |
| Create Department       | ✅       | ❌                          | ❌            |
| Edit/Delete Department  | ✅       | ❌                          | ❌            |
| Invite user as Admin    | ✅       | ❌                          | ❌            |
| Invite user as Viewer   | ✅       | ✅ (own dept)               | ❌            |
| Remove user from dept   | ✅       | ✅ (viewers only, own dept) | ❌            |
| Create task             | ✅       | ✅ (own dept)               | ❌            |
| Read all tasks in dept  | ✅       | ✅ (own dept)               | ❌            |
| Read own tasks          | ✅       | ✅                          | ✅ (own dept) |
| Edit any task in dept   | ✅       | ✅ (own dept)               | ❌            |
| Edit own tasks          | ✅       | ✅                          | ✅ (own dept) |
| Delete any task in dept | ✅       | ✅ (own dept)               | ❌            |
| Delete own tasks        | ✅       | ✅                          | ✅ (own dept) |
| View audit log          | ✅ (all) | ✅ (own dept)               | ❌            |

### Multi-Role Example

User "Alice" is the **Organization Owner** (`isOwner = true`):

- She has NO entries in UserRole — her access is implicit and covers all departments
- She can manage everything across the entire organization

User "Bob" has **department-scoped roles** (entries in UserRole):

- `admin` role in "Engineering" department → manages Engineering tasks and users
- `viewer` role in "Marketing" department → can only see, edit, and delete his own tasks in Marketing
- Bob is NOT an owner (`isOwner = false`)

**Key rule:** A user is EITHER an owner OR has department-scoped roles, never both.

The system always evaluates the **highest privilege** the user has for a given department when checking access.

## API Endpoints

### Auth

- `POST /auth/register` — create user account
- `POST /auth/login` — returns `{ access_token, refresh_token }`
- `POST /auth/refresh` — renew access token

### Organizations

- `GET /organizations/me` — get current user's organization info

### Departments

- `POST /departments` — create department (Owner only)
- `GET /departments` — list departments accessible to user
- `PUT /departments/:id` — edit department (Owner only)
- `DELETE /departments/:id` — delete department (Owner only)

### Department Members (Invitations)

- `POST /departments/:id/members` — invite user to department with role (Owner → admin/viewer, Admin → viewer only)
- `GET /departments/:id/members` — list members of a department (Owner, Admin of that dept)
- `DELETE /departments/:id/members/:userId` — remove user from department (Owner, Admin for viewers only)

### Tasks

- `POST /tasks` — create task in a department (Owner, Admin)
- `GET /tasks` — list accessible tasks (scoped by role + department; Viewer sees only own tasks)
- `GET /tasks/:id` — task detail (if accessible)
- `PUT /tasks/:id` — update task (Owner, Admin of that dept, or Viewer if own task)
- `PATCH /tasks/:id/reorder` — drag-drop reorder (Owner, Admin)
- `DELETE /tasks/:id` — soft delete (Owner, Admin of that dept, or Viewer if own task)

### Audit Log

- `GET /audit-log` — view logs (Owner: all, Admin: own dept)

All endpoints except `/auth/*` require JWT Bearer token.

## Frontend Features

- Login page with JWT auth
- **Department selector** — switch between departments the user has access to
- Task dashboard with Kanban view (3 columns: Todo, In Progress, Done) and list view
- Drag-and-drop between columns to change status (Owner, Admin only)
- Create/edit task modal with validation (Owner, Admin only)
- Viewer sees their own tasks only, with edit and delete capabilities on those tasks
- Filters: search, status, category, priority
- Sorting: by date, priority, title
- **Department management page** (Owner only): create/edit/delete departments
- **Member management** within department: invite/remove users (Owner, Admin)
- Audit log page (Owner: all depts, Admin: own dept)
- Dark/light mode toggle
- Responsive (mobile to desktop)

## Seed Data

- **Organization:** "Acme Corp"
- **Departments:** "Engineering", "Marketing"
- **Users:**
  - owner@acme.com (Password123!) → Organization Owner (isOwner: true, no UserRole entries)
  - admin.eng@acme.com (Password123!) → Admin of Engineering
  - admin.mkt@acme.com (Password123!) → Admin of Marketing
  - viewer1@acme.com (Password123!) → Viewer in Engineering
  - viewer2@acme.com (Password123!) → Viewer in Marketing
  - multi@acme.com (Password123!) → Admin in Engineering + Viewer in Marketing (multi-role demo)
- **Tasks:** 10-15 sample tasks distributed across departments, statuses, and categories

## Key Technical Decisions

- SQLite for simplicity in dev, PostgreSQL-ready via TypeORM
- **UserRole pivot table** enables multi-role per user with department scoping (admin/viewer only)
- **Owner is a flag on User** (`isOwner`), not a UserRole entry — owners bypass permission checks entirely
- Soft deletes on tasks (deletedAt column)
- Global ValidationPipe with class-validator
- Swagger/OpenAPI at /api/docs
- Audit interceptor logs all CRUD actions automatically
- Custom decorators: @CurrentUser(), @Roles(), @RequirePermission(), @Public()
- **Access check flow**: (1) Is user Owner? → grant all. (2) Not owner? → resolve UserRole for the specific department → (3) Admin? → full access to dept tasks. (4) Viewer? → check if resource belongs to user (ownership check) → allow read/edit/delete only on own tasks.

## What I Need From You

When I ask for help, assume this full context. I may ask you to:

- Write or review specific modules, services, guards, or components
- Debug issues
- Generate tests
- Help with Angular components or NestJS patterns
- Review architecture decisions

Always write code that fits this project's conventions and structure. Use TypeScript strict mode. Follow NestJS and Angular best practices.
