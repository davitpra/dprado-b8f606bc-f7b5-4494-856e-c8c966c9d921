import { Test } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PermissionsGuard } from './permissions.guard';
import { AccessControlService } from './access-control.service';
import { Task } from '../entities/task.entity';
import type { User } from '../entities/user.entity';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(id = 'user-id'): User {
  return { id } as User;
}

function makeContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('PermissionsGuard (unit)', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let acl: jest.Mocked<Pick<AccessControlService, 'isOwner' | 'hasPermission'>>;
  let taskRepo: { findOne: jest.Mock };

  const REQUIRED = { action: 'create', resource: 'task' };

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };
    acl = { isOwner: jest.fn(), hasPermission: jest.fn() };
    taskRepo = { findOne: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        { provide: Reflector, useValue: reflector },
        { provide: AccessControlService, useValue: acl },
        { provide: getRepositoryToken(Task), useValue: taskRepo },
      ],
    }).compile();

    guard = module.get(PermissionsGuard);
  });

  afterEach(() => jest.clearAllMocks());

  // ── No @RequirePermission decorator ─────────────────────────────────────────

  describe('no @RequirePermission decorator', () => {
    it('passes through when reflector returns undefined', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const ctx = makeContext({ user: makeUser() });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(acl.isOwner).not.toHaveBeenCalled();
      expect(acl.hasPermission).not.toHaveBeenCalled();
    });
  });

  // ── No user ──────────────────────────────────────────────────────────────────

  describe('no authenticated user', () => {
    it('throws ForbiddenException when request.user is missing', async () => {
      reflector.getAllAndOverride.mockReturnValue(REQUIRED);
      const ctx = makeContext({});
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── Owner bypass ─────────────────────────────────────────────────────────────

  describe('Owner bypass', () => {
    it('returns true immediately without calling hasPermission', async () => {
      reflector.getAllAndOverride.mockReturnValue(REQUIRED);
      acl.isOwner.mockReturnValue(true);
      const ctx = makeContext({ user: makeUser('owner') });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(acl.hasPermission).not.toHaveBeenCalled();
      expect(taskRepo.findOne).not.toHaveBeenCalled();
    });
  });

  // ── resolveDepartmentId priority ─────────────────────────────────────────────

  describe('resolveDepartmentId — source priority', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(REQUIRED);
      acl.isOwner.mockReturnValue(false);
      acl.hasPermission.mockResolvedValue(true);
    });

    it('uses body.departmentId first (highest priority)', async () => {
      const ctx = makeContext({
        user: makeUser(),
        body: { departmentId: 'dept-body' },
        params: { departmentId: 'dept-params' },
        query: { departmentId: 'dept-query' },
      });
      await guard.canActivate(ctx);
      expect(acl.hasPermission).toHaveBeenCalledWith(
        expect.anything(),
        'dept-body',
        'create',
        'task',
      );
    });

    it('falls back to params.departmentId when body is absent', async () => {
      const ctx = makeContext({
        user: makeUser(),
        params: { departmentId: 'dept-params' },
        query: { departmentId: 'dept-query' },
      });
      await guard.canActivate(ctx);
      expect(acl.hasPermission).toHaveBeenCalledWith(
        expect.anything(),
        'dept-params',
        'create',
        'task',
      );
    });

    it('falls back to query.departmentId when body and params are absent', async () => {
      const ctx = makeContext({
        user: makeUser(),
        query: { departmentId: 'dept-query' },
      });
      await guard.canActivate(ctx);
      expect(acl.hasPermission).toHaveBeenCalledWith(
        expect.anything(),
        'dept-query',
        'create',
        'task',
      );
    });

    it('loads task from DB and uses task.departmentId as last resort', async () => {
      const task = { id: 'task-1', departmentId: 'dept-task' } as Task;
      taskRepo.findOne.mockResolvedValue(task);
      const request: Record<string, unknown> = {
        user: makeUser(),
        params: { id: 'task-1' },
      };
      const ctx = makeContext(request);

      await guard.canActivate(ctx);

      expect(taskRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        withDeleted: true,
      });
      expect(acl.hasPermission).toHaveBeenCalledWith(
        expect.anything(),
        'dept-task',
        'create',
        'task',
      );
    });

    it('attaches the loaded task to request.resolvedTask', async () => {
      const task = { id: 'task-1', departmentId: 'dept-task' } as Task;
      taskRepo.findOne.mockResolvedValue(task);
      const request: Record<string, unknown> = {
        user: makeUser(),
        params: { id: 'task-1' },
      };
      const ctx = makeContext(request);

      await guard.canActivate(ctx);

      expect(request['resolvedTask']).toBe(task);
    });

    it('throws ForbiddenException when no departmentId can be resolved', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      const ctx = makeContext({
        user: makeUser(),
        params: { id: 'unknown-task' },
      });
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when no params at all', async () => {
      const ctx = makeContext({ user: makeUser() });
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── hasPermission result ──────────────────────────────────────────────────────

  describe('hasPermission result', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(REQUIRED);
      acl.isOwner.mockReturnValue(false);
    });

    it('returns true when hasPermission resolves true', async () => {
      acl.hasPermission.mockResolvedValue(true);
      const ctx = makeContext({
        user: makeUser(),
        body: { departmentId: 'dept-a' },
      });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it('throws ForbiddenException when hasPermission resolves false', async () => {
      acl.hasPermission.mockResolvedValue(false);
      const ctx = makeContext({
        user: makeUser(),
        body: { departmentId: 'dept-a' },
      });
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('passes action and resource from the decorator to hasPermission', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        action: 'delete',
        resource: 'department',
      });
      acl.hasPermission.mockResolvedValue(true);
      const ctx = makeContext({
        user: makeUser(),
        params: { departmentId: 'dept-a' },
      });
      await guard.canActivate(ctx);
      expect(acl.hasPermission).toHaveBeenCalledWith(
        expect.anything(),
        'dept-a',
        'delete',
        'department',
      );
    });
  });
});
