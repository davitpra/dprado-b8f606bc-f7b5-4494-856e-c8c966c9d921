# Dashboard — Documentación de Tests

Suite completa del proyecto Angular (`apps/dashboard`).
**35 suites · 417 tests · todos en verde.**

Ejecutar con:
```bash
npx nx test dashboard
npx nx test dashboard --testFile=<ruta al spec>   # un archivo solo
npx nx test dashboard --coverage                   # con cobertura
```

---

## Índice

- [Guards](#guards)
- [Interceptor](#interceptor)
- [Stores](#stores)
- [Services](#services)
- [Componentes — Auth](#componentes--auth)
- [Componentes — Tasks](#componentes--tasks)
- [Componentes — Departments](#componentes--departments)
- [Componentes — Audit Log](#componentes--audit-log)
- [Componentes — Shared](#componentes--shared)

---

## Guards

Los guards son funciones `CanActivateFn` que protegen rutas. Se testean con `TestBed.runInInjectionContext()`, sin montar ningún componente.

---

### `auth.guard.spec.ts`
**Archivo:** `core/guards/auth.guard.spec.ts`

Controla el acceso a rutas privadas (`/app/*`). Si no hay sesión activa intenta restaurarla desde `localStorage` vía `AuthService.initializeFromStorage()`.

| Test | Qué verifica |
|------|-------------|
| ya autenticado → `true` | Si `isAuthenticated()` es `true`, pasa sin llamar a `initializeFromStorage` |
| no autenticado pero restore OK → `true` | `initializeFromStorage` devuelve `true`, sesión restaurada |
| no autenticado y restore falla → redirect | Redirige a `/auth/login` cuando no hay sesión recuperable |

---

### `no-auth.guard.spec.ts`
**Archivo:** `core/guards/no-auth.guard.spec.ts`

Inverso de `authGuard`. Protege rutas públicas (`/auth/*`): si el usuario ya tiene sesión lo manda a la app.

| Test | Qué verifica |
|------|-------------|
| ya autenticado → redirect | Redirige a `/app/tasks` sin llamar a `initializeFromStorage` |
| no autenticado pero restore OK → redirect | Restore exitoso, también redirige a `/app/tasks` |
| no autenticado y restore falla → `true` | Permite el acceso a la ruta pública |

---

### `owner.guard.spec.ts`
**Archivo:** `core/guards/owner.guard.spec.ts`

Restringe rutas exclusivas del Owner de la organización (ej. gestión de departamentos).

| Test | Qué verifica |
|------|-------------|
| es owner → `true` | `isOwner()` verdadero, acceso permitido |
| no es owner → redirect | Redirige a `/app/tasks` |

---

### `admin-or-owner.guard.spec.ts`
**Archivo:** `core/guards/admin-or-owner.guard.spec.ts`

Permite el acceso si el usuario es Owner **o** tiene al menos un rol Admin en cualquier departamento.

| Test | Qué verifica |
|------|-------------|
| es owner → `true` | Owner tiene acceso siempre |
| tiene rol ADMIN → `true` | Al menos un `UserRole` con `role=ADMIN` en `userRoles` |
| solo tiene rol VIEWER → redirect | Sin privilegios suficientes |
| sin roles → redirect | Array `userRoles` vacío |

---

### `department-admin.guard.spec.ts`
**Archivo:** `core/guards/department-admin.guard.spec.ts`

Protege rutas de gestión de miembros de un departamento específico (`:id` en la URL).

| Test | Qué verifica |
|------|-------------|
| sin param `:id` → redirect | Si no hay `departmentId` en la ruta, redirige |
| admin en el dept → `true` | `isAdminInDepartment(deptId)` verdadero |
| no admin → redirect | Sin permiso en ese departamento |
| param correcto | Verifica que se pasa el `departmentId` exacto de la ruta a `isAdminInDepartment` |

---

## Interceptor

### `auth.interceptor.spec.ts`
**Archivo:** `core/interceptors/auth.interceptor.spec.ts`

Interceptor HTTP funcional (`withInterceptors`) que inyecta el token JWT en cada petición saliente y gestiona la renovación automática ante respuestas 401.

| Test | Qué verifica |
|------|-------------|
| añade header Authorization | `Bearer <token>` presente cuando `getAccessToken()` devuelve valor |
| sin token → sin header | No modifica la petición cuando no hay token |
| `/api/auth/login` → sin header | URL pública excluida |
| `/api/auth/register` → sin header | URL pública excluida |
| `/api/auth/refresh` → sin header | URL pública excluida |
| 401 → refresh y reintento | Llama a `refreshToken()` y reintenta la petición original con el nuevo token |

---

## Stores

Los stores son clases Angular con signals (`signal`, `computed`). Se inyectan reales en `TestBed` — sin mocks — para verificar las transiciones de estado directamente.

---

### `auth.store.spec.ts`
**Archivo:** `core/stores/auth.store.spec.ts`

Gestiona el estado de autenticación: usuario, tokens, roles y computed properties derivadas.

| Test | Qué verifica |
|------|-------------|
| estado inicial | `isAuthenticated=false`, `isOwner=false`, `user=null`, `currentUserName=null`, `displayRole=null` |
| `setAuthResponse` | Almacena user, roles y tokens; limpia el error anterior |
| `isOwner` | `true` si `user.isOwner=true`; `false` en caso contrario |
| `currentUserName` | Devuelve `"First Last"` cuando hay usuario |
| `displayRole` | `'Owner'` / `'Admin'` / `'Viewer'` / `null` según `userRoles` |
| `getRoleForDepartment` | Devuelve el rol en un departamento concreto; `null` si no tiene; `null` si es owner |
| `isAdminInDepartment` | `true` para owner siempre; `true` para admin; `false` para viewer |
| `isViewerInDepartment` | `true` para viewer; `false` para admin |
| `clearAuth` | Reinicia todo el estado a valores iniciales |
| `setError` / `setLoading` | Actualizan sus respectivas señales |

---

### `task.store.spec.ts`
**Archivo:** `core/stores/task.store.spec.ts`

Gestiona las tareas, filtros, ordenación y selección activa.

| Test | Qué verifica |
|------|-------------|
| estado inicial | `tasks=[]`, `isLoading=false`, `hasActiveFilters=false`, `filteredTasks=[]` |
| `setTasks` | Reemplaza toda la lista |
| `addTask` | Añade al final |
| `updateTask` | Reemplaza la tarea con el mismo `id` |
| `removeTask` | Elimina por `id` |
| `removeTask` limpia `selectedTaskId` | Si la tarea borrada era la seleccionada, `selectedTaskId` pasa a `null` |
| filtro por búsqueda | Coincide en `title` y `description` (case-insensitive) |
| filtro por `status` | Solo tareas con ese status |
| filtro por `category` | Solo tareas con esa categoría |
| filtro por `priority` | Solo tareas con esa prioridad |
| orden por título asc/desc | `localeCompare` |
| orden por prioridad | HIGH < MEDIUM < LOW (y viceversa) |
| orden por posición (default) | Agrupa por status (TODO→IN_PROGRESS→DONE) y luego por `position` |
| `tasksByStatus` | Agrupa en 3 claves; ordena por `position` dentro de cada grupo |
| `hasActiveFilters` | `false` por defecto; `true` al fijar cualquier filtro; `false` tras `resetFilters` |
| `setFilters` | Merge parcial — no sobreescribe campos no indicados |

---

### `department.store.spec.ts`
**Archivo:** `core/stores/department.store.spec.ts`

Gestiona departamentos, departamento activo y lista de miembros.

| Test | Qué verifica |
|------|-------------|
| estado inicial | `departments=[]`, `currentDepartmentId=null`, `members=[]`, `orgUsers=[]` |
| `currentDepartment` | Devuelve el dept que coincide con `currentDepartmentId`; `null` si no hay coincidencia |
| `setCurrentDepartment` | Actualiza el id activo y vacía `members` |
| `setCurrentDepartment(null)` | Limpia el departamento activo |
| `addDepartment` / `updateDepartment` / `removeDepartment` | Mutaciones correctas |
| `removeDepartment` limpia `currentDepartmentId` | Si el dept borrado era el activo |
| `addMember` / `removeMember` / `updateMember` | Mutaciones en la lista de miembros |
| `allKnownUsers` | Mapa unificado de `orgUsers` + `members`; los members sobreescriben org users con mismo id |
| `setError` / `setLoading` / `reset` | Señales individuales y reset completo |

---

### `ui.store.spec.ts`
**Archivo:** `core/stores/ui.store.spec.ts`

Gestiona preferencias de UI: tema, vista de tareas y sidebar.

| Test | Qué verifica |
|------|-------------|
| estado inicial | `theme='light'`, `taskView='list'`, `isSidebarOpen=true` |
| `isDarkMode` | `false` para `'light'`; `true` para `'dark'` |
| `toggleTheme` | Alterna light → dark → light |
| `toggleTheme` persiste | Escribe en `localStorage` |
| `setTheme` | Fija tema directamente y persiste |
| `setTaskView` | Cambia entre `'list'` y `'kanban'` |
| `toggleSidebar` / `closeSidebar` / `openSidebar` | Actualizan `isSidebarOpen` |

---

### `organization.store.spec.ts`
**Archivo:** `core/stores/organization.store.spec.ts`

Almacena los datos de la organización del usuario autenticado.

| Test | Qué verifica |
|------|-------------|
| estado inicial | `organization=null`, `isLoading=false`, `error=null` |
| `setOrganization` | Guarda el objeto y limpia el error |
| `setLoading(true/false)` | Refleja el valor en `isLoading` |
| `setError` | Guarda el mensaje; acepta `null` para limpiar |
| `reset` | Devuelve todo al estado inicial |

---

### `audit-log.store.spec.ts`
**Archivo:** `core/stores/audit-log.store.spec.ts`

Almacena entradas del audit log con paginación y filtros.

| Test | Qué verifica |
|------|-------------|
| estado inicial | `logs=[]`, `page=1`, `limit=20`, `total=0`, `totalPages=0`, filtros vacíos |
| `setLogs` | Actualiza `logs`, `total`, `page`, `limit`, `totalPages` y limpia el error |
| `setFilters` | Merge parcial — los demás campos no cambian |
| `resetFilters` | Devuelve los filtros a `DEFAULT_FILTERS` (todo vacío) |
| `setLoading` / `setError` | Actualizan sus señales; `setError(null)` limpia |

---

## Services

Los servicios HTTP se testean con `provideHttpClientTesting()` + `HttpTestingController`. Los stores y `ToastService` se mockean con `jest.fn()`.

---

### `auth.service.spec.ts`
**Archivo:** `core/services/auth.service.spec.ts`

Gestiona login, registro, logout y renovación de tokens.

| Test | Qué verifica |
|------|-------------|
| `login` éxito | POST `/api/auth/login` → GET `/api/auth/me` → `setAuthResponse` + tokens en `localStorage` |
| `login` error | `setError` + `toastService.error` + relanza la excepción |
| `login` ciclo de loading | Llama `setLoading(true)` al inicio y `setLoading(false)` al final |
| `login` limpia error previo | Llama `setError(null)` al empezar |
| `register` éxito | POST `/api/auth/register` → GET `/api/auth/me` → `setAuthResponse` |
| `register` error | `setError` + `toastService.error` |
| `logout` | Elimina `access_token` y `refresh_token` de `localStorage` |
| `logout` limpia store | Llama `authStore.clearAuth()` |
| `logout` navega | Redirige a `/auth/login` |
| `isTokenExpired` expirado | `exp` en el pasado → `true` |
| `isTokenExpired` vigente | `exp` en el futuro → `false` |
| `isTokenExpired` malformado | Token inválido → `true` |
| `getAccessToken` sin token | Devuelve `null` |
| `getAccessToken` con token | Devuelve el valor de `localStorage` |

---

### `task.service.spec.ts`
**Archivo:** `core/services/task.service.spec.ts`

CRUD de tareas y reordenación entre columnas.

| Test | Qué verifica |
|------|-------------|
| `loadTasks` éxito | GET `/api/tasks` → `taskStore.setTasks(items)` |
| `loadTasks` error | Llama `taskStore.setError` |
| `loadTasks` con `departmentId` | Param `departmentId` incluido en la query |
| `createTask` éxito | POST `/api/tasks` → `addTask` + `toastService.success('Task created')` |
| `createTask` error | `toastService.error` + relanza |
| `updateTask` éxito | PUT `/api/tasks/:id` → `updateTask` + `toastService.success('Task updated')` |
| `updateTask` error | `toastService.error` + relanza |
| `deleteTask` éxito | DELETE `/api/tasks/:id` → `removeTask` + `toastService.success('Task deleted')` |
| `deleteTask` error | `toastService.error` + relanza |
| `reorderTask` éxito | PATCH `/api/tasks/:id/reorder` → `taskStore.updateTask` |
| `reorderTask` error | `toastService.error` + relanza |

---

### `department.service.spec.ts`
**Archivo:** `core/services/department.service.spec.ts`

CRUD de departamentos y gestión de miembros.

| Test | Qué verifica |
|------|-------------|
| `loadDepartments` éxito | GET `/api/departments` → `setDepartments` |
| `loadDepartments` error | `setError` |
| `createDepartment` | POST → `addDepartment` |
| `createDepartment` error | `setError` + `toastService.error` |
| `updateDepartment` | PUT `/api/departments/:id` → `updateDepartment` |
| `deleteDepartment` | DELETE `/api/departments/:id` → `removeDepartment` |
| `inviteMember` éxito | POST `/api/departments/:id/members` → `addMember` |
| `inviteMember` error | `setError` + `toastService.error` |
| `updateMemberRole` | PUT `/api/departments/:id/members/:userId` → `updateMember` |
| `removeMember` | DELETE `/api/departments/:id/members/:userId` → `removeMember` en store |

---

### `toast.service.spec.ts`
**Archivo:** `core/services/toast.service.spec.ts`

Sistema de notificaciones temporales con auto-dismiss.

| Test | Qué verifica |
|------|-------------|
| `success` | Añade toast con `type='success'` y `duration=3000` |
| `error` | Añade toast con `type='error'` y `duration=5000` |
| `warning` | Añade toast con `type='warning'` y `duration=4000` |
| `dismiss(id)` | Elimina el toast con ese id |
| `dismiss` id inexistente | No lanza error |
| auto-dismiss success | Tras 3000 ms (fake timers) el toast desaparece |
| auto-dismiss error | Tras 5000 ms |
| auto-dismiss warning | Tras 4000 ms |
| antes del tiempo → sigue visible | No se elimina prematuramente |
| múltiples toasts | Cada uno recibe un id único |

---

### `organization.service.spec.ts`
**Archivo:** `core/services/organization.service.spec.ts`

Carga los datos de la organización del usuario actual.

| Test | Qué verifica |
|------|-------------|
| éxito | GET `/api/organizations/me` → `setOrganization` + `setLoading(false)` |
| error | `setError('Failed to load organization')` + `setLoading(false)` |

---

### `audit-log.service.spec.ts`
**Archivo:** `core/services/audit-log.service.spec.ts`

Carga el audit log con paginación y filtros opcionales.

| Test | Qué verifica |
|------|-------------|
| éxito | GET `/api/audit-log?page=1&limit=20` → `setLogs(items, total, page, limit, totalPages)` |
| con `departmentId` | Param `departmentId` incluido cuando se pasa |
| con filtros activos | `dateFrom`, `dateTo`, `action`, `resource` incluidos cuando no están vacíos |
| filtros vacíos omitidos | Strings vacíos no se incluyen como params |
| error genérico | `setError('Failed to load audit log')` + `setLoading(false)` |
| error con `error.message` | Extrae el mensaje del cuerpo HTTP y lo pasa a `setError` |

---

## Componentes — Auth

Los componentes de auth se testean con formularios reactivos reales y mocks de `AuthService` / `AuthStore`.

---

### `login.component.spec.ts`
**Archivo:** `features/auth/login/login.component.spec.ts`

Formulario de inicio de sesión.

| Test | Qué verifica |
|------|-------------|
| render inicial | Inputs de email y password presentes; botón submit |
| form vacío → inválido | No llama a `authService.login` |
| email inválido → inválido | Validación de formato |
| form válido | Llama `authService.login(email, password)` y navega a `/app/tasks` |
| error en login | No navega cuando el servicio lanza excepción |
| mensaje de error visible | Renderiza `authStore.error()` en el DOM |
| toggle de contraseña | Click en el icono cambia el `type` entre `password` y `text` |

---

### `register.component.spec.ts`
**Archivo:** `features/auth/register/register.component.spec.ts`

Formulario de registro de usuario.

| Test | Qué verifica |
|------|-------------|
| render inicial | Todos los campos presentes |
| form vacío → inválido | |
| contraseña corta (< 8) → inválida | |
| sin mayúscula → inválida | Patrón requerido |
| sin minúscula → inválida | |
| sin dígito → inválida | |
| form válido | Llama `authService.register` con el payload correcto |
| éxito → navega | Redirige a `/app/tasks` |
| error → no navega | |
| mensaje de error visible | Renderiza `authStore.error()` |

---

## Componentes — Tasks

---

### `task-board.component.spec.ts`
**Archivo:** `features/tasks/task-board/task-board.component.spec.ts`

Componente contenedor (`TaskDashboardComponent`): gestiona el modal de creación/edición y el diálogo de confirmación de borrado.

| Test | Qué verifica |
|------|-------------|
| `canCreateTask` owner | `true` |
| `canCreateTask` admin en dept | `true` |
| `canCreateTask` viewer | `false` |
| `canCreateTask` sin dept y sin owner | `false` |
| `openModal` | `showModal=true` |
| `openModal(task)` | `editingTask` toma el valor de la tarea |
| `closeModal` | `showModal=false` y `editingTask=null` |
| `onSave` modo edición | Llama `taskService.updateTask(id, data)` y cierra el modal |
| `onSave` cierra modal tras update | |
| `onSave` modo creación | Llama `taskService.createTask` con `departmentId` |
| `onSave` sin dept y sin tarea | No llama a `createTask` |
| `onDeleteTask` | Fija `pendingDeleteTask` |
| `confirmDelete` | Llama `taskService.deleteTask` y limpia `pendingDeleteTask` |
| `confirmDelete` sin pending | No hace nada |
| `deleteMessage` sin pending | Devuelve string vacío |
| `deleteMessage` con tarea | Incluye el título de la tarea |

---

### `task-kanban.component.spec.ts`
**Archivo:** `features/tasks/task-kanban/task-kanban.component.spec.ts`

Vista Kanban con tres columnas y drag-and-drop entre columnas.

| Test | Qué verifica |
|------|-------------|
| 3 columnas | Headers "To Do", "In Progress", "Done" presentes |
| columnas con status correcto | Cada columna tiene su `TaskStatus` asignado |
| `canDragTask` owner | `true` |
| `canDragTask` admin en dept | `true` |
| `canDragTask` viewer en tarea propia | `true` |
| `canDragTask` viewer en tarea ajena | `false` |
| drop entre columnas | Llama `taskService.reorderTask` con el nuevo status |
| `toastService.success` al mover columna | Mensaje con el nombre de la columna destino |
| sin `toastService.success` en misma columna | No notifica cuando no cambia de columna |
| reorden en misma columna (owner) | Llama `reorderTask` igualmente |
| drag bloqueado | No hace nada si `canDragTask=false` |

---

### `task-list.component.spec.ts`
**Archivo:** `features/tasks/task-list/task-list.component.spec.ts`

Vista lista con cabeceras ordenables y drag-and-drop de filas.

| Test | Qué verifica |
|------|-------------|
| `canDragTask` owner | `true` |
| `canDragTask` admin | `true` |
| `canDragTask` viewer en tarea propia (creador) | `true` |
| `canDragTask` viewer en tarea asignada | `true` |
| `canDragTask` viewer en tarea ajena | `false` |
| `canDragTask` sin usuario | `false` |
| `canEditTask` owner | `true` |
| `canEditTask` admin | `true` |
| `canEditTask` creador | `true` |
| `canEditTask` viewer ajeno | `false` |
| click cabecera nueva columna | `setFilters({ sortBy, sortDirection: 'asc' })` |
| click misma cabecera | Alterna a `'desc'` |
| click de vuelta | Alterna a `'asc'` |
| `onDrop` lista | Llama `taskService.reorderTask` para cada tarea afectada |
| drag bloqueado | No hace nada si `canDragTask=false` |

---

### `task-modal.component.spec.ts`
**Archivo:** `features/tasks/task-modal/task-modal.component.spec.ts`

Modal de creación y edición de tareas.

| Test | Qué verifica |
|------|-------------|
| crear — defaults | `status=TODO`, `priority=MEDIUM`, `category=WORK` |
| crear — título requerido | Form inválido sin título; no emite `saved` |
| crear — form válido | Emite `saved` con los valores del form |
| crear — sin `dueDate` | No incluye la clave `dueDate` si el campo está vacío |
| `onClose` | Emite `closed` |
| editar — patch inicial | `ngOnInit` carga título, status, priority, category, dueDate de la tarea |
| editar — submit | Emite `saved` con los valores modificados |
| editar — con `dueDate` | Incluye la clave cuando tiene valor |

---

### `task-filters.component.spec.ts`
**Archivo:** `features/tasks/task-filters/task-filters.component.spec.ts`

Barra de filtros: búsqueda, status, categoría y prioridad.

| Test | Qué verifica |
|------|-------------|
| input búsqueda | Llama `setFilters({ search: value })` |
| búsqueda vacía | `setFilters({ search: '' })` |
| selector status | `setFilters({ status: value })` |
| selector status vacío | `setFilters({ status: null })` |
| selector categoría | `setFilters({ category: value })` |
| selector categoría vacío | `setFilters({ category: null })` |
| selector prioridad | `setFilters({ priority: value })` |
| selector prioridad vacío | `setFilters({ priority: null })` |
| `statuses` | Contiene todos los valores de `TaskStatus` |
| `categories` | Contiene todos los valores de `TaskCategory` |
| `priorities` | Contiene todos los valores de `TaskPriority` |

---

### `task-card.component.spec.ts`
**Archivo:** `features/tasks/task-card/task-card.component.spec.ts`

Tarjeta individual de tarea en la vista Kanban.

| Test | Qué verifica |
|------|-------------|
| renderiza título | El `title` de la tarea aparece en el DOM |
| renderiza prioridad | Badge con la prioridad visible |
| sin `assignedToId` → `null` | `assignedUser` devuelve `null` |
| `assignedToId` en store → usuario | Devuelve el user de `allKnownUsers` |
| `assignedToId` no en store → `null` | |
| `canEdit` sin usuario | `false` |
| `canEdit` owner | `true` |
| `canEdit` admin en dept | `true` |
| `canEdit` creador de la tarea | `true` |
| `canEdit` viewer ajeno | `false` |
| click editar | Emite output `edit` con la tarea |
| click borrar | Emite output `delete` con la tarea |
| botones visibles si `canEdit=true` | Botones de edición y borrado en el DOM |
| botones ocultos si `canEdit=false` | |

---

## Componentes — Departments

---

### `departments-page.component.spec.ts`
**Archivo:** `features/departments/departments-page/departments-page.component.spec.ts`

Página de gestión de departamentos (solo Owner).

| Test | Qué verifica |
|------|-------------|
| init | Llama `loadDepartments` al iniciar |
| `openModal` | `showModal=true` |
| `openModal(dept)` | `editingDept` toma el valor del dept |
| `openModal` sin dept | `editingDept=null` |
| `closeModal` | `showModal=false` y `editingDept=null` |
| `confirmDelete` | Fija `deletingDept` y muestra el diálogo |
| `cancelDelete` | Limpia `deletingDept` y oculta el diálogo |
| `onDeleteConfirmed` | Llama `departmentService.deleteDepartment(id)` |
| `onDeleteConfirmed` limpia estado antes | Limpia `deletingDept` antes de llamar al servicio |
| `onDeleteConfirmed` sin dept | No hace nada |

---

### `department-form-modal.component.spec.ts`
**Archivo:** `features/departments/department-form-modal/department-form-modal.component.spec.ts`

Modal de creación y edición de departamentos.

| Test | Qué verifica |
|------|-------------|
| crear — form vacío | Campos vacíos al abrir |
| crear — nombre requerido | Form inválido sin nombre |
| crear — form válido | Form válido con nombre |
| crear — nombre > 100 chars | Inválido |
| crear — submit inválido | No llama al servicio |
| crear — submit válido | Llama `createDepartment` |
| crear — emite `closed` | Tras creación exitosa |
| editar — patch inicial | Rellena nombre y descripción del dept |
| editar — submit | Llama `updateDepartment(id, data)` |
| editar — emite `closed` | Tras actualización exitosa |
| limpia error y emite `closed` | Al cerrar limpia el error del store |

---

### `members-page.component.spec.ts`
**Archivo:** `features/departments/members-page/members-page.component.spec.ts`

Página de gestión de miembros de un departamento.

| Test | Qué verifica |
|------|-------------|
| init | Lee `:id` de la ruta y llama `loadMembers` |
| `canInvite` owner | `true` |
| `canInvite` admin en dept | `true` |
| `canInvite` viewer | `false` |
| `canCreateUser` owner | `true` |
| `canCreateUser` no owner | `false` |
| `canRemoveMember` owner vs admin | Owner puede eliminar admin |
| `canRemoveMember` admin vs viewer | Admin puede eliminar viewer |
| `canRemoveMember` admin vs admin | Admin no puede eliminar otro admin |
| `canRemoveMember` viewer | No puede eliminar a nadie |
| `openInviteModal` | `showInviteModal=true` |
| `closeInviteModal` | `showInviteModal=false` |
| `confirmRemove` | Fija `removingMember` y muestra diálogo |
| `cancelRemove` | Limpia estado |
| `onRemoveConfirmed` | Llama `departmentService.removeMember` |
| `onRemoveConfirmed` limpia estado | |
| `onRemoveConfirmed` sin pending | No hace nada |
| `onRoleChange` | Llama `updateMemberRole` |
| mismo rol → no llama | No llama si el rol no cambió (case-insensitive) |

---

### `invite-member-modal.component.spec.ts`
**Archivo:** `features/departments/invite-member-modal/invite-member-modal.component.spec.ts`

Modal para invitar usuarios existentes o crear nuevos y añadirlos al departamento.

| Test | Qué verifica |
|------|-------------|
| init | Llama `loadOrgUsers` |
| carga usuarios | Actualiza `orgUsers` con los usuarios cargados |
| modo default | `mode='existing'` |
| filtra owners | Los usuarios con `isOwner=true` no aparecen en la lista |
| filtra miembros actuales | Los ya invitados no aparecen disponibles |
| cambio a modo `new` | Actualiza `mode` |
| cambio limpia error | Limpia el error del store al cambiar modo |
| `canCreateUser` owner | `true` |
| `canCreateUser` no owner | `false` |
| `inviteExisting` válido | Llama `inviteMember(userId, role)` |
| `inviteExisting` inválido | No llama si el form es inválido |
| `inviteExisting` emite `closed` | Tras invitación exitosa |
| `inviteNew` válido | Llama `createOrgUser` luego `inviteMember` |
| `inviteNew` inválido | No envía con form inválido |
| password inválida | Patrón requerido (mayúscula + minúscula + dígito) |
| `closed` al finalizar | Limpia error y emite `closed` |

---

## Componentes — Audit Log

---

### `audit-log-page.component.spec.ts`
**Archivo:** `features/audit-log/audit-log-page/audit-log-page.component.spec.ts`

Página del registro de auditoría con filtros, paginación y visualización de entradas.

| Test | Qué verifica |
|------|-------------|
| init sin dept | `loadLogs(1, null)` llamado en el efecto inicial |
| init con dept | `loadLogs(1, deptId)` cuando `currentDepartmentId` tiene valor |
| `getActionBadgeClass('create')` | Incluye `bg-green-100` |
| `getActionBadgeClass('CREATE')` | Case-insensitive — mismo resultado que `'create'` |
| `getActionBadgeClass('update')` | Incluye `bg-blue-100` |
| `getActionBadgeClass('delete')` | Incluye `bg-red-100` |
| `getActionBadgeClass('read')` | Incluye `bg-gray-100` (default) |
| `getUserDisplay` con user | Devuelve `"First Last"` |
| `getUserDisplay` sin user | Devuelve `log.userId` |
| `formatDetails({})` | Devuelve `'—'` |
| `formatDetails` con `originalAction` | `'denied: <action>'` |
| `formatDetails` con `body` | `'key: value · key: value'` |
| `formatDetails` con `departmentId` conocido | `'dept: Engineering'` |
| `formatDetails` con `departmentId` desconocido | `'dept: '` + primeros 8 chars del id |
| `formatDetails` sin clave reconocida | Devuelve `'—'` |
| `rangeStart` página 1 | `1` |
| `rangeEnd` página 1, total 45 | `20` |
| `rangeStart` página 2 | `21` |
| `rangeEnd` página 2, total 45 | `40` |
| `rangeEnd` página 3, total 45 | `45` (Math.min corta en el total) |
| `onFilterChange` | `setFilters(partial)` + `loadLogs(1, deptId)` |
| `onClearFilters` | `resetFilters()` + `loadLogs(1, deptId)` |
| `onPageChange(n)` | `loadLogs(n, deptId)` |

---

## Componentes — Shared

---

### `confirm-dialog.component.spec.ts`
**Archivo:** `shared/confirm-dialog/confirm-dialog.component.spec.ts`

Diálogo de confirmación reutilizable (borrado de tareas, departamentos, miembros).

| Test | Qué verifica |
|------|-------------|
| renderiza `message` | El texto del input `message` aparece en el DOM |
| renderiza `confirmLabel` custom | Etiqueta personalizable en el botón de confirmar |
| `confirmLabel` default | Valor por defecto `"Delete"` |
| click confirmar | Emite output `confirmed` |
| click cancelar (botón principal) | Emite output `cancelled` |
| click cancelar (botón texto) | Emite output `cancelled` |
| `role="dialog"` | Accesibilidad: el elemento raíz tiene el rol correcto |
| inputs reactivos | Los signals de input funcionan correctamente |

---

### `toast-container.component.spec.ts`
**Archivo:** `shared/toast/toast-container.component.spec.ts`

Contenedor de notificaciones toast.

| Test | Qué verifica |
|------|-------------|
| lista vacía | No renderiza elementos toast |
| color success | `bg-green-600` |
| color error | `bg-red-600` |
| color warning | `bg-amber-500` |
| texto blanco | `text-white` para todos los tipos |
| icono success | `lucideCheckCircle` |
| icono error | `lucideXCircle` |
| icono warning | `lucideAlertTriangle` |
| `trackBy` | Devuelve el `id` del toast |

---

### `header.component.spec.ts`
**Archivo:** `shared/layout/header/header.component.spec.ts`

Cabecera de la aplicación: selector de departamento, badge de rol, toggle de tema y logout.

| Test | Qué verifica |
|------|-------------|
| `roleLabel` owner | Devuelve `'Owner'` |
| `roleLabel` admin (con dept activo) | Devuelve `'Admin'` |
| `roleLabel` viewer (con dept activo) | Devuelve `'Viewer'` |
| `roleLabel` sin dept activo | Usa `displayRole` del store |
| `accessibleDepartments` owner | Devuelve todos los departamentos |
| `accessibleDepartments` no owner | Solo los depts donde el usuario tiene rol |
| `isOwner` true | |
| `isOwner` false | |
| click toggle tema | Llama `uiStore.toggleTheme()` |
| click logout | Llama `authService.logout()` |
| cambio de dept | Llama `departmentStore.setCurrentDepartment(id)` |
| selección "todos" (valor vacío) | Llama `setCurrentDepartment(null)` |
| `roleBadgeClasses` Owner | Incluye `purple` |
| `roleBadgeClasses` Admin | Incluye `blue` |
| `roleBadgeClasses` Viewer | Incluye `gray` |
