import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRole } from '@task-management/data';
import { AccessControlService } from './access-control.service';
import { UserRoleEntity } from '../entities/user-role.entity';
import { Permission } from '../entities/permission.entity';
import type { User } from '../entities/user.entity';
import type { Task } from '../entities/task.entity';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides: {
  id?: string;
  isOwner?: boolean;
  organizationId?: string;
  roles?: Array<{ role: UserRole; departmentId: string | null }>;
}): User {
  const { isOwner = false, roles = [], id = 'user-id', organizationId = 'org-id' } = overrides;
  // Use a plain object and cast via unknown — avoids strict Entity type checks in tests
  const user: Record<string, unknown> = {
    id,
    email: 'user@test.com',
    firstName: 'Test',
    lastName: 'User',
    organizationId,
    createdAt: new Date(),
    roles,
  };
  Object.defineProperty(user, 'isOwner', { get: () => isOwner });
  return user as unknown as User;
}

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 'task-id',
    title: 'Test Task',
    departmentId: 'dept-a',
    createdById: 'other-user-id',
    assignedToId: null,
    ...overrides,
  } as Task;
}

describe('AccessControlService (unit)', () => {
  let service: AccessControlService;
  let userRoleRepo: jest.Mocked<{
    findOne: jest.Mock;
    find: jest.Mock;
    count: jest.Mock;
  }>;
  let permissionRepo: jest.Mocked<{
    count: jest.Mock;
  }>;

  beforeEach(async () => {
    userRoleRepo = { findOne: jest.fn(), find: jest.fn(), count: jest.fn() };
    permissionRepo = { count: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AccessControlService,
        { provide: getRepositoryToken(UserRoleEntity), useValue: userRoleRepo },
        { provide: getRepositoryToken(Permission), useValue: permissionRepo },
      ],
    }).compile();

    service = module.get(AccessControlService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── isOwner ───────────────────────────────────────────────────────────────

  describe('isOwner()', () => {
    it('returns true for a user with isOwner = true', () => {
      const user = makeUser({ isOwner: true });
      expect(service.isOwner(user)).toBe(true);
    });

    it('returns false for a user with isOwner = false', () => {
      const user = makeUser({ isOwner: false });
      expect(service.isOwner(user)).toBe(false);
    });
  });

  // ── getUserRoleForDepartment ───────────────────────────────────────────────

  describe('getUserRoleForDepartment()', () => {
    it('returns the role from the fast path (user.roles already loaded)', async () => {
      const user = makeUser({
        id: 'user-a',
        roles: [{ role: UserRole.ADMIN, departmentId: 'dept-a' }],
      });
      const role = await service.getUserRoleForDepartment('user-a', 'dept-a', user);
      expect(role).toBe(UserRole.ADMIN);
      expect(userRoleRepo.findOne).not.toHaveBeenCalled();
    });

    it('returns null from fast path when user has no role in that dept', async () => {
      const user = makeUser({
        id: 'user-a',
        roles: [{ role: UserRole.ADMIN, departmentId: 'dept-b' }],
      });
      const role = await service.getUserRoleForDepartment('user-a', 'dept-a', user);
      expect(role).toBeNull();
    });

    it('falls back to DB query when user.roles is not provided', async () => {
      userRoleRepo.findOne.mockResolvedValueOnce({
        role: UserRole.VIEWER,
        departmentId: 'dept-a',
      });
      const role = await service.getUserRoleForDepartment('user-a', 'dept-a');
      expect(userRoleRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-a', departmentId: 'dept-a' },
      });
      expect(role).toBe(UserRole.VIEWER);
    });

    it('returns null from DB fallback when no role exists', async () => {
      userRoleRepo.findOne.mockResolvedValueOnce(null);
      const role = await service.getUserRoleForDepartment('user-a', 'dept-a');
      expect(role).toBeNull();
    });
  });

  // ── canAccessTask ─────────────────────────────────────────────────────────

  describe('canAccessTask()', () => {
    it('Owner can access any task', async () => {
      const user = makeUser({ isOwner: true });
      const task = makeTask({ departmentId: 'dept-a' });
      await expect(service.canAccessTask(user, task)).resolves.toBe(true);
    });

    it('Admin can access any task in their department', async () => {
      const user = makeUser({
        id: 'admin-id',
        roles: [{ role: UserRole.ADMIN, departmentId: 'dept-a' }],
      });
      const task = makeTask({ departmentId: 'dept-a', createdById: 'other' });
      await expect(service.canAccessTask(user, task)).resolves.toBe(true);
    });

    it("Admin cannot access tasks in another department", async () => {
      const user = makeUser({
        id: 'admin-id',
        roles: [{ role: UserRole.ADMIN, departmentId: 'dept-b' }],
      });
      const task = makeTask({ departmentId: 'dept-a' });
      await expect(service.canAccessTask(user, task)).resolves.toBe(false);
    });

    it('Viewer can access own task (created by them)', async () => {
      const user = makeUser({
        id: 'viewer-id',
        roles: [{ role: UserRole.VIEWER, departmentId: 'dept-a' }],
      });
      const task = makeTask({ departmentId: 'dept-a', createdById: 'viewer-id' });
      await expect(service.canAccessTask(user, task)).resolves.toBe(true);
    });

    it('Viewer can access task assigned to them', async () => {
      const user = makeUser({
        id: 'viewer-id',
        roles: [{ role: UserRole.VIEWER, departmentId: 'dept-a' }],
      });
      const task = makeTask({
        departmentId: 'dept-a',
        createdById: 'other',
        assignedToId: 'viewer-id',
      });
      await expect(service.canAccessTask(user, task)).resolves.toBe(true);
    });

    it("Viewer cannot access another user's task", async () => {
      const user = makeUser({
        id: 'viewer-id',
        roles: [{ role: UserRole.VIEWER, departmentId: 'dept-a' }],
      });
      const task = makeTask({
        departmentId: 'dept-a',
        createdById: 'other',
        assignedToId: null,
      });
      await expect(service.canAccessTask(user, task)).resolves.toBe(false);
    });

    it('User with no role in department cannot access task', async () => {
      const user = makeUser({ id: 'user-id', roles: [] });
      const task = makeTask({ departmentId: 'dept-a' });
      await expect(service.canAccessTask(user, task)).resolves.toBe(false);
    });
  });

  // ── canModifyTask ─────────────────────────────────────────────────────────

  describe('canModifyTask()', () => {
    it('Owner can modify any task', async () => {
      const user = makeUser({ isOwner: true });
      const task = makeTask({});
      await expect(service.canModifyTask(user, task)).resolves.toBe(true);
    });

    it('Admin can modify tasks in own department', async () => {
      const user = makeUser({
        id: 'admin-id',
        roles: [{ role: UserRole.ADMIN, departmentId: 'dept-a' }],
      });
      const task = makeTask({ departmentId: 'dept-a' });
      await expect(service.canModifyTask(user, task)).resolves.toBe(true);
    });

    it('Viewer can modify own task', async () => {
      const user = makeUser({
        id: 'viewer-id',
        roles: [{ role: UserRole.VIEWER, departmentId: 'dept-a' }],
      });
      const task = makeTask({ departmentId: 'dept-a', createdById: 'viewer-id' });
      await expect(service.canModifyTask(user, task)).resolves.toBe(true);
    });

    it("Viewer cannot modify another user's task", async () => {
      const user = makeUser({
        id: 'viewer-id',
        roles: [{ role: UserRole.VIEWER, departmentId: 'dept-a' }],
      });
      const task = makeTask({ departmentId: 'dept-a', createdById: 'other' });
      await expect(service.canModifyTask(user, task)).resolves.toBe(false);
    });
  });

  // ── canCreateTaskInDepartment ─────────────────────────────────────────────

  describe('canCreateTaskInDepartment()', () => {
    it('Owner can create tasks in any department', async () => {
      const user = makeUser({ isOwner: true });
      await expect(
        service.canCreateTaskInDepartment(user, 'dept-a'),
      ).resolves.toBe(true);
    });

    it('Admin can create tasks in their department', async () => {
      const user = makeUser({
        id: 'admin-id',
        roles: [{ role: UserRole.ADMIN, departmentId: 'dept-a' }],
      });
      await expect(
        service.canCreateTaskInDepartment(user, 'dept-a'),
      ).resolves.toBe(true);
    });

    it('Admin cannot create tasks in another department', async () => {
      const user = makeUser({
        id: 'admin-id',
        roles: [{ role: UserRole.ADMIN, departmentId: 'dept-b' }],
      });
      await expect(
        service.canCreateTaskInDepartment(user, 'dept-a'),
      ).resolves.toBe(false);
    });

    it('Viewer cannot create tasks', async () => {
      const user = makeUser({
        id: 'viewer-id',
        roles: [{ role: UserRole.VIEWER, departmentId: 'dept-a' }],
      });
      await expect(
        service.canCreateTaskInDepartment(user, 'dept-a'),
      ).resolves.toBe(false);
    });
  });

  // ── canManageDepartmentMembers ────────────────────────────────────────────

  describe('canManageDepartmentMembers()', () => {
    it('Owner can manage members with any target role', async () => {
      const user = makeUser({ isOwner: true });
      await expect(
        service.canManageDepartmentMembers(user, 'dept-a', UserRole.ADMIN),
      ).resolves.toBe(true);
      await expect(
        service.canManageDepartmentMembers(user, 'dept-a', UserRole.VIEWER),
      ).resolves.toBe(true);
    });

    it('Admin can invite Viewers in own department', async () => {
      const user = makeUser({
        id: 'admin-id',
        roles: [{ role: UserRole.ADMIN, departmentId: 'dept-a' }],
      });
      await expect(
        service.canManageDepartmentMembers(user, 'dept-a', UserRole.VIEWER),
      ).resolves.toBe(true);
    });

    it('Admin cannot invite Admins (only Owner can)', async () => {
      const user = makeUser({
        id: 'admin-id',
        roles: [{ role: UserRole.ADMIN, departmentId: 'dept-a' }],
      });
      await expect(
        service.canManageDepartmentMembers(user, 'dept-a', UserRole.ADMIN),
      ).resolves.toBe(false);
    });

    it('Viewer cannot manage members', async () => {
      const user = makeUser({
        id: 'viewer-id',
        roles: [{ role: UserRole.VIEWER, departmentId: 'dept-a' }],
      });
      await expect(
        service.canManageDepartmentMembers(user, 'dept-a', UserRole.VIEWER),
      ).resolves.toBe(false);
    });
  });

  // ── getUserDepartments ────────────────────────────────────────────────────

  describe('getUserDepartments()', () => {
    it('returns departments from DB where user has dept-scoped roles', async () => {
      const mockDept = { id: 'dept-a', name: 'Engineering' };
      userRoleRepo.find.mockResolvedValueOnce([
        { departmentId: 'dept-a', department: mockDept },
      ]);
      const depts = await service.getUserDepartments('user-id');
      expect(depts).toEqual([mockDept]);
    });

    it('excludes entries where departmentId is null (OWNER role)', async () => {
      userRoleRepo.find.mockResolvedValueOnce([
        { departmentId: null, department: null },
        { departmentId: 'dept-a', department: { id: 'dept-a' } },
      ]);
      const depts = await service.getUserDepartments('user-id');
      expect(depts.length).toBe(1);
    });
  });
});
