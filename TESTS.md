# Documentación de Tests

Cobertura completa del monorepo: NestJS API + Angular Dashboard.

---

# API — Documentación de Tests

Suite completa del backend NestJS (`apps/api`).
**17 spec files · 320 tests · todos en verde.**

Ejecutar con:
```bash
npx nx test api
npx nx test api --testFile=<ruta al spec>   # un archivo solo
npx nx test api --coverage                   # con cobertura
```

Infraestructura:
- **Tests unitarios** — `@nestjs/testing` con repositorios mockeados mediante `jest.fn()`
- **Tests de integración** — NestJS full app + `supertest` + SQLite en memoria (`:memory:`)
- `apps/api/src/test-setup.ts` — fija variables de entorno antes de cualquier import
- `apps/api/src/test/helpers/app.helper.ts` — `createTestApp()` construye la app completa de prueba
- `apps/api/src/test/helpers/seed.helper.ts` — `seedTestData()` + `getToken()` para escenarios RBAC

---

## Índice

- [Access Control (unitarios)](#access-control-unitarios)
- [Auth (unitarios)](#auth-unitarios)
- [Audit (unitarios)](#audit-unitarios)
- [Services de dominio (unitarios)](#services-de-dominio-unitarios)
- [Auth API (integración)](#auth-api-integración)
- [Tasks API (integración)](#tasks-api-integración)
- [Departments API (integración)](#departments-api-integración)
- [Members API (integración)](#members-api-integración)
- [Organizations API (integración)](#organizations-api-integración)
- [Audit Log API (integración)](#audit-log-api-integración)

---

## Access Control (unitarios)

### `access-control.service.spec.ts`
**Archivo:** `apps/api/src/app/access-control/access-control.service.spec.ts`
**27 tests**

Lógica central RBAC con repositorios mockeados. Cubre los cinco métodos públicos del servicio.

**`isOwner()`**

| Test | Qué verifica |
|------|-------------|
| usuario con `isOwner=true` | Devuelve `true` |
| usuario con `isOwner=false` | Devuelve `false` |

**`getUserRoleForDepartment()`**

| Test | Qué verifica |
|------|-------------|
| fast-path — rol en dept encontrado | Devuelve el rol desde `user.roles` sin consultar DB |
| fast-path — sin rol en ese dept | Devuelve `null` sin consultar DB |
| DB fallback — rol encontrado | Llama a `findOne` cuando no hay `user.roles` precargados |
| DB fallback — sin rol | Devuelve `null` cuando DB no encuentra nada |

**`canAccessTask()`**

| Test | Qué verifica |
|------|-------------|
| Owner | Accede a cualquier tarea |
| Admin en su dept | Accede a tarea del dept |
| Admin en otro dept | No puede acceder |
| Viewer — tarea propia (creador) | Puede acceder |
| Viewer — tarea asignada a él | Puede acceder |
| Viewer — tarea ajena | No puede acceder |
| Sin rol en el dept | No puede acceder |

**`canModifyTask()`**

| Test | Qué verifica |
|------|-------------|
| Owner | Puede modificar cualquier tarea |
| Admin en su dept | Puede modificar |
| Viewer — tarea propia | Puede modificar |
| Viewer — tarea ajena | No puede modificar |

**`canCreateTaskInDepartment()`**

| Test | Qué verifica |
|------|-------------|
| Owner | Puede crear en cualquier dept |
| Admin en su dept | Puede crear |
| Admin en otro dept | No puede crear |
| Viewer | No puede crear |

**`canManageDepartmentMembers()`**

| Test | Qué verifica |
|------|-------------|
| Owner — rol Admin | Puede gestionar |
| Owner — rol Viewer | Puede gestionar |
| Admin — invitar Viewer en su dept | Puede |
| Admin — invitar Admin | No puede (solo Owner) |
| Viewer — cualquier rol | No puede gestionar |

**`getUserDepartments()`**

| Test | Qué verifica |
|------|-------------|
| devuelve depts con rol dept-scoped | Array de departamentos del usuario |
| excluye entradas con `departmentId=null` | Las filas de OWNER no aparecen |

---

### `permissions.guard.spec.ts`
**Archivo:** `apps/api/src/app/access-control/permissions.guard.spec.ts`
**16 tests**

Guard que comprueba el decorador `@RequirePermission`. Verifica la resolución del `departmentId` y el bypass de Owner.

| Test | Qué verifica |
|------|-------------|
| sin `@RequirePermission` | Pasa sin verificar permisos |
| sin usuario autenticado | Lanza `ForbiddenException` |
| Owner — bypass | Devuelve `true` sin llamar a `hasPermission` |
| `body.departmentId` (prioridad máxima) | Se pasa al `hasPermission` |
| `params.departmentId` (fallback) | Cuando el body no lo tiene |
| `query.departmentId` (fallback) | Cuando body y params son vacíos |
| DB lookup de tarea (último recurso) | Carga la tarea por `params.id` y usa su `departmentId` |
| Adjunta tarea cargada a `request.resolvedTask` | Para evitar doble lookup en guards siguientes |
| Sin `departmentId` resoluble | Lanza `ForbiddenException` |
| Sin params en absoluto | Lanza `ForbiddenException` |
| `hasPermission → true` | Guard devuelve `true` |
| `hasPermission → false` | Lanza `ForbiddenException` |
| Propaga `action` y `resource` del decorador | Los pasa exactos a `hasPermission` |

---

### `task-ownership.guard.spec.ts`
**Archivo:** `apps/api/src/app/access-control/task-ownership.guard.spec.ts`
**12 tests**

Guard de propiedad de tareas para rutas `POST /tasks` (crear) y `PUT/PATCH/DELETE /tasks/:id` (modificar).

| Test | Qué verifica |
|------|-------------|
| sin usuario | Lanza `ForbiddenException` |
| Owner — bypass | Devuelve `true` sin checks adicionales |
| checkCreate — `canCreate → true` | Permite |
| checkCreate — `canCreate → false` | Lanza `ForbiddenException` |
| checkCreate — sin `body.departmentId` | Lanza `ForbiddenException` |
| checkCreate — sin body | Lanza `ForbiddenException` |
| checkModify — `canModify → true` | Permite |
| checkModify — `canModify → false` | Lanza `ForbiddenException` |
| checkModify — tarea no existe | Lanza `NotFoundException` |
| checkModify — consulta con `withDeleted: true` | Soft-deletes también se validan |
| checkModify — adjunta a `request.resolvedTask` | Evita DB lookup redundante |
| checkModify — reutiliza `request.resolvedTask` cacheado | No llama a `findOne` si ya existe |

---

## Auth (unitarios)

### `auth.service.spec.ts`
**Archivo:** `apps/api/src/app/auth/auth.service.spec.ts`
**20 tests**

Lógica de autenticación con JwtService, bcrypt y repositorios mockeados.

**`register()`**

| Test | Qué verifica |
|------|-------------|
| email duplicado | Lanza `ConflictException` |
| crea organización para el nuevo usuario | `orgRepo.create` llamado con el nombre correcto |
| usa `organizationName` del dto si se provee | Nombre de org personalizable |
| crea el usuario vinculado a la org | `userRepo.create` con `organizationId` correcto |
| crea rol OWNER con `departmentId=null` | Fila de `user_roles` org-wide |
| devuelve `access_token` y `refresh_token` | Dos tokens generados |

**`login()`**

| Test | Qué verifica |
|------|-------------|
| usuario no encontrado | Lanza `UnauthorizedException` |
| contraseña incorrecta | Lanza `UnauthorizedException` |
| credenciales válidas | Devuelve tokens |
| selecciona campo password en query | `addSelect('user.password')` |
| carga relación roles | `leftJoinAndSelect('user.roles', 'roles')` |

**`refreshToken()`**

| Test | Qué verifica |
|------|-------------|
| tipo de token no es `'refresh'` | Lanza `UnauthorizedException` |
| usuario no encontrado | Lanza `UnauthorizedException` |
| token de refresh válido | Devuelve nuevos tokens |

**`validateToken()`**

| Test | Qué verifica |
|------|-------------|
| token inválido/expirado | Lanza `UnauthorizedException` |
| token válido | Devuelve el payload decodificado |
| pasa `JWT_SECRET` correcto a `verify` | Usa la config para la clave |

---

### `jwt.strategy.spec.ts`
**Archivo:** `apps/api/src/app/auth/jwt.strategy.spec.ts`
**2 tests**

Lógica de `JwtStrategy.validate()`: lookup de usuario en DB tras verificar el JWT.

| Test | Qué verifica |
|------|-------------|
| usuario encontrado | Devuelve el objeto user con roles cargados |
| usuario no encontrado | Lanza `UnauthorizedException` |

---

## Audit (unitarios)

### `audit.service.spec.ts`
**Archivo:** `apps/api/src/app/audit/audit.service.spec.ts`
**22 tests**

Servicio de auditoría: escritura silenciosa y consulta con RBAC + filtros + paginación.

**`log()`**

| Test | Qué verifica |
|------|-------------|
| crea y guarda la entrada | `create` + `save` del repositorio |
| error de DB — no lanza | Swallows la excepción silenciosamente |
| error en `create` — no lanza | Swallows la excepción silenciosamente |

**`findAll()` — RBAC**

| Test | Qué verifica |
|------|-------------|
| Owner — scope a su organización | `WHERE user.organizationId = :orgId` |
| Admin con un dept | Filtra por ese `departmentId` en el JSON de `details` |
| Admin con múltiples depts | Construye condición OR |
| Viewer | Lanza `ForbiddenException` |

**`findAll()` — filtros opcionales**

| Test | Qué verifica |
|------|-------------|
| `dateFrom` | `timestamp >= :dateFrom` |
| `dateTo` | `timestamp <= :dateTo` |
| `userId` | `userId = :userId` |
| `action` | `action = :action` |
| `resource` | `resource = :resource` |
| `departmentId` | `LIKE` sobre el JSON de `details` |
| múltiples filtros | Todos aplicados independientemente |
| sin filtros | Sin `andWhere` adicionales |

**`findAll()` — paginación**

| Test | Qué verifica |
|------|-------------|
| defaults `page=1, limit=20` | `skip=0, take=20` |
| `page=3, limit=10` | `skip=20, take=10` |
| shape de `PaginatedResponseDto` | `items`, `total`, `page`, `limit`, `totalPages` |
| `totalPages` redondea hacia arriba | `ceil(21/10) = 3` |

---

### `audit.interceptor.spec.ts`
**Archivo:** `apps/api/src/app/audit/audit.interceptor.spec.ts`
**20 tests**

Interceptor que registra automáticamente todas las mutaciones HTTP.

**Condiciones de skip**

| Test | Qué verifica |
|------|-------------|
| peticiones GET | No se auditan |
| rutas `/api/auth/*` | Excluidas |
| ruta `/api/audit-log` | Excluida |

**`mapMethodToAction`**

| Test | Qué verifica |
|------|-------------|
| `POST → "create"` | |
| `PUT → "update"` | |
| `PATCH → "update"` | |
| `DELETE → "delete"` | |

**`deriveResource`**

| Test | Qué verifica |
|------|-------------|
| `/api/tasks` → `"task"` | |
| `/api/tasks/123` → `"task"` | |
| `/api/departments` → `"department"` | |
| `/api/departments/:id/members` → `"member"` | |
| `/api/organizations/me/users` → `"organization"` | |
| URL con query params | Se eliminan antes del parseo |

**`resourceId`, `departmentId`, `ipAddress`, `userId`**

| Test | Qué verifica |
|------|-------------|
| POST — usa id del response body | |
| PUT/DELETE — usa `params.id` | |
| `body.departmentId` (prioridad) | |
| `params.departmentId` (ruta de members) | |
| Response body `departmentId` (task update) | |
| Dept create — usa id del response como `departmentId` | |
| Dept update — usa `params.id` como `departmentId` | |
| Strips `password` del body en los detalles | Datos sensibles no se loguean |
| `x-forwarded-for` header | Prioridad sobre `socket.remoteAddress` |
| `socket.remoteAddress` (fallback) | |
| `request.user.id` cuando autenticado | |
| `"anonymous"` cuando no hay user | |

**`access_denied`**

| Test | Qué verifica |
|------|-------------|
| `ForbiddenException` con user autenticado | Loguea `action: 'access_denied'` |
| `ForbiddenException` sin user | No loguea (usuarios anónimos) |
| Re-lanza el error original | El error llega al cliente |
| Error no-Forbidden | No loguea `access_denied` |

---

## Services de dominio (unitarios)

### `departments.service.spec.ts`
**Archivo:** `apps/api/src/app/departments/departments.service.spec.ts`
**16 tests**

CRUD de departamentos con guard de Owner y scoping a organización.

**`create()`**

| Test | Qué verifica |
|------|-------------|
| no-Owner | Lanza `ForbiddenException` |
| Owner — crea dept en su org | `organizationId` correcto |
| con `description` | Se almacena |
| sin `description` | Se almacena como `null` |

**`findAll()`**

| Test | Qué verifica |
|------|-------------|
| Owner — todos los depts de la org | Usa `find({ where: { organizationId } })` |
| No-Owner — delega a `acl.getUserDepartments` | No llama a `find` directamente |

**`update()`**

| Test | Qué verifica |
|------|-------------|
| no-Owner | Lanza `ForbiddenException` |
| dept no existe | Lanza `NotFoundException` |
| dept de otra org | Lanza `ForbiddenException` |
| Owner — aplica dto y guarda | `save` llamado |

**`remove()`**

| Test | Qué verifica |
|------|-------------|
| no-Owner | Lanza `ForbiddenException` |
| dept no existe | Lanza `NotFoundException` |
| dept de otra org | Lanza `ForbiddenException` |
| Owner — elimina | `remove` llamado |

---

### `department-members.service.spec.ts`
**Archivo:** `apps/api/src/app/department-members/department-members.service.spec.ts`
**20 tests**

Gestión de miembros: invite, list, remove, updateRole.

**`invite()`**

| Test | Qué verifica |
|------|-------------|
| dept no encontrado | Lanza `NotFoundException` |
| dept de otra org | Lanza `ForbiddenException` |
| `canManage → false` | Lanza `ForbiddenException` |
| usuario target no encontrado | Lanza `NotFoundException` |
| usuario target de otra org | Lanza `ForbiddenException` |
| target es Owner de la org | Lanza `ForbiddenException` |
| target ya tiene rol en dept | Lanza `ConflictException` |
| éxito | Crea `UserRole` y lo devuelve |

**`findAll()`**

| Test | Qué verifica |
|------|-------------|
| dept no encontrado | Lanza `NotFoundException` |
| Viewer | Lanza `ForbiddenException` |
| sin rol en dept | Lanza `ForbiddenException` |
| Owner — bypass del check de rol | Devuelve todos los miembros |
| Admin — puede listar | Devuelve miembros |

**`remove()`**

| Test | Qué verifica |
|------|-------------|
| miembro no encontrado | Lanza `NotFoundException` |
| Owner — puede eliminar a cualquiera | `remove` llamado |
| no-Admin intenta eliminar | Lanza `ForbiddenException` |
| Admin intenta eliminar a otro Admin | Lanza `ForbiddenException` |
| Admin elimina Viewer | `remove` llamado |

**`updateRole()`**

| Test | Qué verifica |
|------|-------------|
| no-Owner | Lanza `ForbiddenException` |
| miembro no encontrado | Lanza `NotFoundException` |
| Owner — actualiza rol y devuelve | `save` llamado; devuelve el `UserRole` actualizado |

---

### `organizations.service.spec.ts`
**Archivo:** `apps/api/src/app/organizations/organizations.service.spec.ts`
**9 tests**

Organización del usuario: consulta y creación de usuarios en la org.

**`getByUser()`**

| Test | Qué verifica |
|------|-------------|
| org no encontrada | Lanza `NotFoundException` |
| éxito | Devuelve org con relación `departments` cargada |

**`getUsersForOrg()`**

| Test | Qué verifica |
|------|-------------|
| org no encontrada | Lanza `NotFoundException` |
| éxito | Devuelve array de users con relaciones `users` y `users.roles` |

**`createUser()`**

| Test | Qué verifica |
|------|-------------|
| no-Owner | Lanza `ForbiddenException` |
| email duplicado | Lanza `ConflictException` |
| Owner — crea user en su org | `organizationId` del owner |
| devuelve el user guardado | `save` llamado |

---

### `tasks.service.spec.ts`
**Archivo:** `apps/api/src/app/tasks/tasks.service.spec.ts`
**34 tests**

CRUD completo de tareas con posicionamiento, filtros RBAC y soft delete.

**`create()`**

| Test | Qué verifica |
|------|-------------|
| dept no encontrado | Lanza `NotFoundException` |
| dept de otra org | Lanza `NotFoundException` |
| `canCreate → false` | Lanza `ForbiddenException` |
| calcula posición por query builder | `position = maxPos + 1` |
| asigna `createdById` del usuario | |
| sin tareas previas — posición `0` | `maxPos = -1 → position = 0` |
| devuelve tarea con relaciones | `findOne` con `['createdBy', 'assignedTo']` |

**`findAll()`**

| Test | Qué verifica |
|------|-------------|
| Owner — consulta todos los depts de la org | `departmentId IN (...)` |
| Owner — org sin depts | Devuelve vacío |
| No-owner — sin roles en depts | Devuelve vacío |
| No-owner — filtra por dept sin acceso | Lanza `ForbiddenException` |
| Admin — ve todas las tareas del dept | |
| Viewer — condition restringe a tareas propias | `createdById = :userId OR assignedToId = :userId` |
| filtro `status` | Aplica `andWhere` con `status` |
| shape de `PaginatedResponseDto` | `page`, `limit`, `total`, `items` |

**`findOne()`**

| Test | Qué verifica |
|------|-------------|
| tarea no encontrada | Lanza `NotFoundException` |
| `canAccess → false` | Lanza `ForbiddenException` |
| acceso concedido | Devuelve la tarea |

**`update()`**

| Test | Qué verifica |
|------|-------------|
| tarea no encontrada | Lanza `NotFoundException` |
| `canModify → false` | Lanza `ForbiddenException` |
| aplica campos del dto y guarda | `save` llamado |
| limpia `assignedTo` cuando `assignedToId` viene en dto | Evita caching inconsistente |
| no limpia `assignedTo` si no viene en dto | Preserva el valor existente |
| devuelve tarea refrescada con relaciones | Segundo `findOne` |

**`reorder()`**

| Test | Qué verifica |
|------|-------------|
| tarea no encontrada | Lanza `NotFoundException` |
| `canModify → false` | Lanza `ForbiddenException` |
| Viewer intenta reordenar | Lanza `ForbiddenException` |
| Owner — sin check de rol | `getUserRoleForDepartment` no llamado |
| Admin — puede reordenar | `save` llamado |
| aplica `status` y `position` del dto | |

**`remove()`**

| Test | Qué verifica |
|------|-------------|
| tarea no encontrada | Lanza `NotFoundException` |
| `canModify → false` | Lanza `ForbiddenException` |
| llama `softRemove` | Soft delete (preserva en DB) |
| devuelve la tarea después del delete | |

---

## Auth API (integración)

### `auth.spec.ts`
**Archivo:** `apps/api/src/test/auth.spec.ts`
**18 tests**

App NestJS completa + SQLite en memoria. Cubre registro, login, refresh y guard JWT.

**`POST /api/auth/register`**

| Test | HTTP | Qué verifica |
|------|------|-------------|
| registro válido | 201 | Devuelve `access_token` y `refresh_token` |
| email duplicado | 409 | |
| campos requeridos faltantes | 400 | |
| email inválido | 400 | |
| contraseña débil (sin mayúscula) | 400 | |

**`POST /api/auth/login`**

| Test | HTTP | Qué verifica |
|------|------|-------------|
| credenciales válidas | 201 | Devuelve ambos tokens |
| contraseña incorrecta | 401 | |
| email desconocido | 401 | |
| credenciales faltantes | 400 | |

**`POST /api/auth/refresh`**

| Test | HTTP | Qué verifica |
|------|------|-------------|
| refresh token válido | 201 | Nuevos tokens en respuesta |
| token inválido (string plano) | 401 | |
| access token usado como refresh | 401 | El tipo de token se valida |

**`GET /api/auth/me`**

| Test | HTTP | Qué verifica |
|------|------|-------------|
| con token válido | 200 | User con `isOwner`, roles; sin `password` |
| sin token | 401 | |

**JWT guard (rutas protegidas)**

| Test | HTTP | Qué verifica |
|------|------|-------------|
| `GET /tasks` sin token | 401 | |
| token malformado | 401 | |
| sin prefijo `Bearer` | 401 | |

---

## Tasks API (integración)

### `tasks.spec.ts`
**Archivo:** `apps/api/src/test/tasks.spec.ts`
**32 tests**

Matriz completa de RBAC × todos los endpoints de tareas. Usa 6 tokens (owner, adminEng, adminMkt, viewer1, viewer2, multi).

**`POST /api/tasks`**

| Test | HTTP | Actor |
|------|------|-------|
| Owner crea tarea en cualquier dept | 201 | owner |
| Admin crea en su dept | 201 | adminEng |
| Admin no puede crear en otro dept | 403 | adminEng → Marketing |
| Viewer no puede crear | 403 | viewer1 |
| Campos requeridos faltantes | 400 | |
| Dept no existente | 404 | |

**`GET /api/tasks`**

| Test | HTTP | Qué verifica |
|------|------|-------------|
| Owner ve todas las tareas de todos los depts | 200 | `departmentId` de Engineering y Marketing |
| Admin ve solo las de su dept | 200 | Solo Engineering |
| Viewer ve solo sus propias tareas | 200 | `createdById` o `assignedToId` del viewer |
| Multi-rol ve Engineering (admin) + Marketing propio (viewer) | 200 | |
| Filtro por `status` | 200 | Solo tareas con ese status |
| Filtro por `departmentId` | 200 | Solo tareas del dept |

**`GET /api/tasks/:id`**

| Test | HTTP | Actor |
|------|------|-------|
| Owner puede leer cualquier tarea | 200 | |
| Admin puede leer tarea de su dept | 200 | |
| Admin no puede leer tarea de otro dept | 403 | adminEng → mktTask |
| Viewer puede leer su propia tarea | 200 | |
| Viewer no puede leer tarea ajena del mismo dept | 403 | |
| Tarea no existente | 404 | |

**`PUT /api/tasks/:id`**

| Test | HTTP | Actor |
|------|------|-------|
| Owner puede actualizar cualquier tarea | 200 | |
| Admin puede actualizar tarea de su dept | 200 | |
| Admin de otro dept no puede | 403 | adminMkt |
| Viewer puede actualizar su propia tarea | 200 | |
| Viewer no puede actualizar tarea ajena | 403 | |

**`PATCH /api/tasks/:id/reorder`**

| Test | HTTP | Actor |
|------|------|-------|
| Owner puede reordenar | 200 | Cambia status a IN_PROGRESS |
| Admin puede reordenar en su dept | 200 | Cambia status a DONE |
| Viewer no puede reordenar | 403 | |
| Admin de otro dept no puede reordenar | 403 | adminMkt |

**`DELETE /api/tasks/:id`**

| Test | HTTP | Actor |
|------|------|-------|
| Owner puede eliminar cualquier tarea | 200 | Soft delete |
| Admin puede eliminar tarea de su dept | 200 | |
| Admin no puede eliminar tarea de otro dept | 403 | |
| Viewer puede eliminar su propia tarea | 200 | |
| Viewer no puede eliminar tarea ajena | 403 | |

---

## Departments API (integración)

### `departments.spec.ts`
**Archivo:** `apps/api/src/test/departments.spec.ts`
**17 tests**

CRUD de departamentos con scoping por rol. Solo el Owner puede crear, actualizar y eliminar.

**`POST /api/departments`**

| Test | HTTP | Actor |
|------|------|-------|
| Owner crea dept | 201 | |
| Admin no puede crear | 403 | |
| Viewer no puede crear | 403 | |
| Nombre faltante | 400 | |
| Sin token | 401 | |

**`GET /api/departments`**

| Test | HTTP | Qué verifica |
|------|------|-------------|
| Owner ve todos los depts | 200 | Engineering y Marketing |
| Admin ve solo su dept | 200 | Solo Engineering; no Marketing |
| Viewer ve solo su dept | 200 | Solo Engineering |
| Sin token | 401 | |

**`PUT /api/departments/:id`**

| Test | HTTP | Actor |
|------|------|-------|
| Owner puede actualizar | 200 | Campo `name` actualizado |
| Admin no puede | 403 | |
| Viewer no puede | 403 | |
| Dept no existente | 404 | |

**`DELETE /api/departments/:id`**

| Test | HTTP | Actor |
|------|------|-------|
| Admin no puede eliminar | 403 | |
| Viewer no puede eliminar | 403 | |
| Owner puede eliminar | 204 | |
| Dept no existente | 404 | |

---

## Members API (integración)

### `members.spec.ts`
**Archivo:** `apps/api/src/test/members.spec.ts`
**21 tests**

Invite, list, update role y remove de miembros de departamento.

**`GET /api/departments/:id/members`**

| Test | HTTP | Actor |
|------|------|-------|
| Owner ve miembros de cualquier dept | 200 | |
| Admin ve miembros de su dept | 200 | |
| Viewer no puede listar | 403 | |
| Dept no existente | 404 | |
| Sin token | 401 | |

**`POST /api/departments/:id/members`**

| Test | HTTP | Qué verifica |
|------|------|-------------|
| Owner invita como Admin | 201 | `role = ADMIN` |
| Owner invita como Viewer | 201 | `role = VIEWER` |
| Admin invita Viewer en su dept | 201 | |
| Admin no puede invitar Admin | 403 | Solo Owner puede asignar ADMIN |
| Admin no puede invitar en otro dept | 403 | |
| Viewer no puede invitar a nadie | 403 | |
| Usuario ya tiene rol en el dept | 409 | |
| Asignar rol al Owner de la org | 403 | No se puede dar rol dept al Owner |

**`PUT /api/departments/:id/members/:userId`**

| Test | HTTP | Qué verifica |
|------|------|-------------|
| Owner actualiza rol | 200 | VIEWER → ADMIN |
| Admin no puede actualizar rol | 403 | Solo Owner |
| Miembro no existente | 404 | |

**`DELETE /api/departments/:id/members/:userId`**

| Test | HTTP | Qué verifica |
|------|------|-------------|
| Owner elimina cualquier miembro | 204 | |
| Admin elimina Viewer de su dept | 204 | |
| Admin no puede eliminar otro Admin | 403 | |
| Viewer no puede eliminar a nadie | 403 | |
| Miembro no existente | 404 | |

---

## Organizations API (integración)

### `organizations.spec.ts`
**Archivo:** `apps/api/src/test/organizations.spec.ts`
**11 tests**

Organización del usuario y gestión de usuarios de la org.

**`GET /api/organizations/me`**

| Test | HTTP | Qué verifica |
|------|------|-------------|
| Owner | 200 | `name`, `departments` presentes |
| Admin | 200 | |
| Viewer | 200 | |
| Sin token | 401 | |

**`GET /api/organizations/me/users`**

| Test | HTTP | Qué verifica |
|------|------|-------------|
| Owner lista usuarios | 200 | Array no vacío; sin `password` expuesto |
| Admin lista usuarios | 200 | |
| Sin token | 401 | |

**`POST /api/organizations/me/users`**

| Test | HTTP | Qué verifica |
|------|------|-------------|
| Owner crea usuario en la org | 201 | `id`, `email` presentes; sin `password` |
| Admin no puede crear | 403 | |
| Email duplicado | 409 | |
| Campos requeridos faltantes | 400 | |

---

## Audit Log API (integración)

### `audit.spec.ts`
**Archivo:** `apps/api/src/test/audit.spec.ts`
**23 tests**

Registro de auditoría: RBAC de acceso, scoping por dept del Admin, paginación, filtros y shape de la respuesta.

**`GET /api/audit-log` — control de acceso**

| Test | HTTP | Actor |
|------|------|-------|
| Owner accede | 200 | `items` y `total` presentes |
| Admin accede | 200 | |
| Viewer no puede acceder | 403 | |
| Sin token | 401 | |

**`GET /api/audit-log` — scoping de Admin**

| Test | Qué verifica |
|------|-------------|
| adminEng solo ve entradas de Engineering | Todos los `details.departmentId` = Engineering |
| adminMkt solo ve entradas de Marketing | Todos los `details.departmentId` = Marketing |
| Owner ve entradas de todos los depts | Engineering y Marketing en el mismo resultado |

**`GET /api/audit-log` — paginación**

| Test | Qué verifica |
|------|-------------|
| `?page=1&limit=5` | `page=1`, `limit=5`, `items.length ≤ 5` |
| `?page=1&limit=1` | `totalPages` presente y `≥ 1` |

**`GET /api/audit-log` — filtros**

| Test | Qué verifica |
|------|-------------|
| `?action=create` | Solo entradas con `action = 'create'` |
| `?resource=task` | Solo entradas con `resource = 'task'` |
| `?resource=department` | Solo entradas con `resource = 'department'` |
| `?userId=<ownerId>` | Solo entradas del owner |
| `?departmentId=<engId>` | Solo entradas de Engineering |
| `?action=create&resource=task` | Filtros combinados |
| `?dateFrom` en el futuro | 0 resultados |
| `?dateTo` en el pasado | 0 resultados |

**Shape de las entradas**

| Test | Qué verifica |
|------|-------------|
| campos obligatorios | `id`, `action`, `resource`, `resourceId`, `userId`, `timestamp`, `details` |
| sin `password` en `details.body` | Datos sensibles no se exponen |

---

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
