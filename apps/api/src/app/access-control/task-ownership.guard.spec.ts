import { Test } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaskOwnershipGuard } from './task-ownership.guard';
import { AccessControlService } from './access-control.service';
import { Task } from '../entities/task.entity';
import type { User } from '../entities/user.entity';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(id = 'user-id'): User {
  return { id } as User;
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-id',
    departmentId: 'dept-a',
    createdById: 'user-id',
    assignedToId: null,
    ...overrides,
  } as Task;
}

function makeContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('TaskOwnershipGuard (unit)', () => {
  let guard: TaskOwnershipGuard;
  let acl: jest.Mocked<
    Pick<AccessControlService, 'isOwner' | 'canCreateTaskInDepartment' | 'canModifyTask'>
  >;
  let taskRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    acl = {
      isOwner: jest.fn(),
      canCreateTaskInDepartment: jest.fn(),
      canModifyTask: jest.fn(),
    };
    taskRepo = { findOne: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        TaskOwnershipGuard,
        { provide: AccessControlService, useValue: acl },
        { provide: getRepositoryToken(Task), useValue: taskRepo },
      ],
    }).compile();

    guard = module.get(TaskOwnershipGuard);
  });

  afterEach(() => jest.clearAllMocks());

  // ── No user ──────────────────────────────────────────────────────────────────

  describe('no authenticated user', () => {
    it('throws ForbiddenException when request.user is missing', async () => {
      const ctx = makeContext({});
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── Owner bypass ─────────────────────────────────────────────────────────────

  describe('Owner bypass', () => {
    it('returns true without any further checks', async () => {
      acl.isOwner.mockReturnValue(true);
      const ctx = makeContext({ user: makeUser('owner'), params: {} });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(acl.canCreateTaskInDepartment).not.toHaveBeenCalled();
      expect(acl.canModifyTask).not.toHaveBeenCalled();
      expect(taskRepo.findOne).not.toHaveBeenCalled();
    });
  });

  // ── checkCreate (no params.id) ───────────────────────────────────────────────

  describe('checkCreate — POST /tasks (no params.id)', () => {
    beforeEach(() => acl.isOwner.mockReturnValue(false));

    it('returns true when canCreateTaskInDepartment resolves true', async () => {
      acl.canCreateTaskInDepartment.mockResolvedValue(true);
      const ctx = makeContext({
        user: makeUser(),
        body: { departmentId: 'dept-a' },
        params: {},
      });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(acl.canCreateTaskInDepartment).toHaveBeenCalledWith(
        expect.anything(),
        'dept-a',
      );
    });

    it('throws ForbiddenException when canCreateTaskInDepartment returns false', async () => {
      acl.canCreateTaskInDepartment.mockResolvedValue(false);
      const ctx = makeContext({
        user: makeUser(),
        body: { departmentId: 'dept-a' },
        params: {},
      });
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when body has no departmentId', async () => {
      const ctx = makeContext({ user: makeUser(), body: {}, params: {} });
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      expect(acl.canCreateTaskInDepartment).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when body is absent', async () => {
      const ctx = makeContext({ user: makeUser(), params: {} });
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── checkModify (params.id present) ──────────────────────────────────────────

  describe('checkModify — PUT/PATCH/DELETE /tasks/:id (params.id present)', () => {
    beforeEach(() => acl.isOwner.mockReturnValue(false));

    it('returns true when canModifyTask resolves true', async () => {
      const task = makeTask();
      taskRepo.findOne.mockResolvedValue(task);
      acl.canModifyTask.mockResolvedValue(true);
      const ctx = makeContext({ user: makeUser(), params: { id: 'task-id' } });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(acl.canModifyTask).toHaveBeenCalledWith(expect.anything(), task);
    });

    it('throws ForbiddenException when canModifyTask returns false', async () => {
      const task = makeTask({ createdById: 'other-user' });
      taskRepo.findOne.mockResolvedValue(task);
      acl.canModifyTask.mockResolvedValue(false);
      const ctx = makeContext({ user: makeUser('viewer'), params: { id: 'task-id' } });
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when task does not exist', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      const ctx = makeContext({ user: makeUser(), params: { id: 'non-existent' } });
      await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
    });

    it('queries DB with withDeleted: true (soft-deleted tasks are checked)', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      const ctx = makeContext({ user: makeUser(), params: { id: 'deleted-task' } });
      await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
      expect(taskRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'deleted-task' },
        withDeleted: true,
      });
    });

    it('attaches loaded task to request.resolvedTask', async () => {
      const task = makeTask();
      taskRepo.findOne.mockResolvedValue(task);
      acl.canModifyTask.mockResolvedValue(true);
      const request: Record<string, unknown> = {
        user: makeUser(),
        params: { id: 'task-id' },
      };
      const ctx = makeContext(request);

      await guard.canActivate(ctx);

      expect(request['resolvedTask']).toBe(task);
    });

    it('reuses request.resolvedTask cache — skips DB lookup', async () => {
      const cachedTask = makeTask({ id: 'task-id' });
      acl.canModifyTask.mockResolvedValue(true);
      const ctx = makeContext({
        user: makeUser(),
        params: { id: 'task-id' },
        resolvedTask: cachedTask,
      });

      await guard.canActivate(ctx);

      expect(taskRepo.findOne).not.toHaveBeenCalled();
      expect(acl.canModifyTask).toHaveBeenCalledWith(expect.anything(), cachedTask);
    });
  });
});
