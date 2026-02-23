import {
  IAuditLog,
  IDepartment,
  ITask,
  IUser,
  IUserRole,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  UserRole,
} from '@task-management/data';

export function makeUser(overrides: Partial<IUser> = {}): IUser {
  return {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    organizationId: 'org-1',
    isOwner: false,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeTask(overrides: Partial<ITask> = {}): ITask {
  return {
    id: 'task-1',
    title: 'Test Task',
    status: TaskStatus.TODO,
    category: TaskCategory.WORK,
    priority: TaskPriority.MEDIUM,
    position: 0,
    departmentId: 'dept-1',
    createdById: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeDepartment(overrides: Partial<IDepartment> = {}): IDepartment {
  return {
    id: 'dept-1',
    name: 'Engineering',
    organizationId: 'org-1',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeUserRole(overrides: Partial<IUserRole> = {}): IUserRole {
  return {
    id: 'role-1',
    userId: 'user-1',
    role: UserRole.VIEWER,
    departmentId: 'dept-1',
    ...overrides,
  };
}

export function makeAuditLog(overrides: Partial<IAuditLog> = {}): IAuditLog {
  return {
    id: 'log-1',
    action: 'create',
    resource: 'task',
    resourceId: 'task-1',
    userId: 'user-1',
    ipAddress: '127.0.0.1',
    timestamp: '2026-01-01T00:00:00.000Z',
    details: {},
    ...overrides,
  };
}
