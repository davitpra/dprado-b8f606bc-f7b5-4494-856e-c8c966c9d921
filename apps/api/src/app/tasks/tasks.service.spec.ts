import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaskStatus, TaskCategory, TaskPriority, UserRole } from '@task-management/data';

import { TasksService } from './tasks.service';
import { Task } from '../entities/task.entity';
import { Department } from '../entities/department.entity';
import { AccessControlService } from '../access-control/access-control.service';
import type { User } from '../entities/user.entity';
import type { CreateTaskDto, UpdateTaskDto, ReorderTaskDto, TaskFilterDto } from '@task-management/data/dto';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(opts: { id?: string; isOwner?: boolean; orgId?: string } = {}): User {
  const { id = 'user-id', isOwner = true, orgId = 'org-id' } = opts;
  const u: Record<string, unknown> = { id, organizationId: orgId };
  Object.defineProperty(u, 'isOwner', { get: () => isOwner });
  return u as unknown as User;
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-id',
    title: 'Test Task',
    description: null,
    status: TaskStatus.TODO,
    category: TaskCategory.WORK,
    priority: TaskPriority.MEDIUM,
    position: 0,
    dueDate: null,
    createdById: 'user-id',
    assignedToId: null,
    departmentId: 'dept-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null as unknown as User,
    assignedTo: null,
    department: null as unknown as Department,
    ...overrides,
  } as Task;
}

function makeDept(orgId = 'org-id'): Department {
  return { id: 'dept-id', name: 'Engineering', organizationId: orgId } as Department;
}

/** Creates a chainable query builder mock */
function makeQb(result: unknown = null) {
  const qb: Record<string, jest.Mock> = {};
  const chainable = [
    'select', 'addSelect', 'leftJoinAndSelect', 'where', 'andWhere',
    'orderBy', 'skip', 'take',
  ];
  chainable.forEach((m) => { qb[m] = jest.fn().mockReturnThis(); });
  qb['getRawOne'] = jest.fn().mockResolvedValue(result);
  qb['getMany'] = jest.fn().mockResolvedValue(result);
  qb['getManyAndCount'] = jest.fn().mockResolvedValue([result, 0]);
  return qb;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('TasksService (unit)', () => {
  let service: TasksService;
  let taskRepo: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    softRemove: jest.Mock;
  };
  let deptRepo: { findOne: jest.Mock; createQueryBuilder: jest.Mock };
  let acl: jest.Mocked<
    Pick<
      AccessControlService,
      | 'isOwner'
      | 'canCreateTaskInDepartment'
      | 'canAccessTask'
      | 'canModifyTask'
      | 'getUserDepartments'
      | 'getUserRoleForDepartment'
    >
  >;

  beforeEach(async () => {
    taskRepo = {
      createQueryBuilder: jest.fn(),
      create: jest.fn((d) => ({ ...d })),
      save: jest.fn((e) => Promise.resolve({ id: 'task-id', ...e })),
      findOne: jest.fn(),
      softRemove: jest.fn().mockResolvedValue(undefined),
    };
    deptRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    acl = {
      isOwner: jest.fn(),
      canCreateTaskInDepartment: jest.fn(),
      canAccessTask: jest.fn(),
      canModifyTask: jest.fn(),
      getUserDepartments: jest.fn(),
      getUserRoleForDepartment: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: taskRepo },
        { provide: getRepositoryToken(Department), useValue: deptRepo },
        { provide: AccessControlService, useValue: acl },
      ],
    }).compile();

    service = module.get(TasksService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create() ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    const dto: CreateTaskDto = {
      title: 'New Task',
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      departmentId: 'dept-id',
    };

    it('throws NotFoundException when department not found', async () => {
      deptRepo.findOne.mockResolvedValue(null);
      await expect(service.create(makeUser(), dto)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when department belongs to another org', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept('other-org'));
      await expect(service.create(makeUser(), dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user cannot create tasks in dept', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.canCreateTaskInDepartment.mockResolvedValue(false);
      await expect(service.create(makeUser(), dto)).rejects.toThrow(ForbiddenException);
    });

    it('calculates position via query builder', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.canCreateTaskInDepartment.mockResolvedValue(true);
      const posQb = makeQb({ maxPos: 2 });
      const createdTask = makeTask({ id: 'new-task-id' });
      taskRepo.createQueryBuilder.mockReturnValue(posQb);
      taskRepo.findOne.mockResolvedValue(createdTask);
      await service.create(makeUser(), dto);
      expect(posQb['getRawOne']).toHaveBeenCalled();
      expect(taskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ position: 3 }),
      );
    });

    it('assigns createdById from the calling user', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.canCreateTaskInDepartment.mockResolvedValue(true);
      taskRepo.createQueryBuilder.mockReturnValue(makeQb({ maxPos: -1 }));
      taskRepo.findOne.mockResolvedValue(makeTask());
      await service.create(makeUser({ id: 'my-user' }), dto);
      expect(taskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdById: 'my-user' }),
      );
    });

    it('defaults position to 0 when no tasks exist yet (maxPos = -1)', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.canCreateTaskInDepartment.mockResolvedValue(true);
      taskRepo.createQueryBuilder.mockReturnValue(makeQb({ maxPos: -1 }));
      taskRepo.findOne.mockResolvedValue(makeTask());
      await service.create(makeUser(), dto);
      expect(taskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ position: 0 }),
      );
    });

    it('returns the saved task with relations', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.canCreateTaskInDepartment.mockResolvedValue(true);
      taskRepo.createQueryBuilder.mockReturnValue(makeQb({ maxPos: 0 }));
      const saved = makeTask();
      taskRepo.findOne.mockResolvedValue(saved);
      const result = await service.create(makeUser(), dto);
      expect(taskRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ relations: ['createdBy', 'assignedTo'] }),
      );
      expect(result).toBe(saved);
    });
  });

  // ── findAll() ─────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    const filters: TaskFilterDto = {};

    it('Owner: queries all org departments then filters tasks', async () => {
      acl.isOwner.mockReturnValue(true);
      const deptQb = makeQb([{ id: 'dept-id' }]);
      const taskQb = makeQb(null);
      taskQb['getManyAndCount'] = jest.fn().mockResolvedValue([[makeTask()], 1]);
      deptRepo.createQueryBuilder.mockReturnValue(deptQb);
      taskRepo.createQueryBuilder.mockReturnValue(taskQb);
      const result = await service.findAll(makeUser(), filters);
      expect(deptQb['getMany']).toHaveBeenCalled();
      expect(taskQb['andWhere']).toHaveBeenCalledWith(
        expect.stringContaining('departmentId IN'),
        expect.any(Object),
      );
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('Owner: returns empty when organization has no departments', async () => {
      acl.isOwner.mockReturnValue(true);
      const deptQb = makeQb([]);
      const taskQb = makeQb(null);
      deptRepo.createQueryBuilder.mockReturnValue(deptQb);
      taskRepo.createQueryBuilder.mockReturnValue(taskQb);
      const result = await service.findAll(makeUser(), filters);
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('Non-owner: returns empty when user has no department roles', async () => {
      acl.isOwner.mockReturnValue(false);
      acl.getUserDepartments.mockResolvedValue([]);
      const taskQb = makeQb(null);
      taskRepo.createQueryBuilder.mockReturnValue(taskQb);
      const result = await service.findAll(makeUser({ isOwner: false }), filters);
      expect(result.items).toHaveLength(0);
    });

    it('Non-owner: throws ForbiddenException when filtering by dept user has no access to', async () => {
      acl.isOwner.mockReturnValue(false);
      acl.getUserDepartments.mockResolvedValue([{ id: 'dept-a' } as Department]);
      acl.getUserRoleForDepartment.mockResolvedValue(UserRole.VIEWER);
      const taskQb = makeQb(null);
      taskRepo.createQueryBuilder.mockReturnValue(taskQb);
      await expect(
        service.findAll(makeUser({ isOwner: false }), { departmentId: 'dept-b' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Admin: can see all tasks in their department', async () => {
      acl.isOwner.mockReturnValue(false);
      acl.getUserDepartments.mockResolvedValue([{ id: 'dept-id' } as Department]);
      acl.getUserRoleForDepartment.mockResolvedValue(UserRole.ADMIN);
      const taskQb = makeQb(null);
      taskQb['getManyAndCount'] = jest.fn().mockResolvedValue([[makeTask()], 1]);
      taskRepo.createQueryBuilder.mockReturnValue(taskQb);
      const result = await service.findAll(makeUser({ isOwner: false }), filters);
      expect(result.total).toBe(1);
    });

    it('Viewer: condition restricts to own tasks in their department', async () => {
      acl.isOwner.mockReturnValue(false);
      acl.getUserDepartments.mockResolvedValue([{ id: 'dept-id' } as Department]);
      acl.getUserRoleForDepartment.mockResolvedValue(UserRole.VIEWER);
      const taskQb = makeQb(null);
      taskQb['getManyAndCount'] = jest.fn().mockResolvedValue([[], 0]);
      taskRepo.createQueryBuilder.mockReturnValue(taskQb);
      await service.findAll(makeUser({ isOwner: false }), filters);
      expect(taskQb['andWhere']).toHaveBeenCalledWith(
        expect.stringContaining('createdById'),
        expect.any(Object),
      );
    });

    it('applies status filter when provided', async () => {
      acl.isOwner.mockReturnValue(true);
      const deptQb = makeQb([{ id: 'dept-id' }]);
      const taskQb = makeQb(null);
      taskQb['getManyAndCount'] = jest.fn().mockResolvedValue([[], 0]);
      deptRepo.createQueryBuilder.mockReturnValue(deptQb);
      taskRepo.createQueryBuilder.mockReturnValue(taskQb);
      await service.findAll(makeUser(), { status: TaskStatus.IN_PROGRESS });
      expect(taskQb['andWhere']).toHaveBeenCalledWith(
        expect.stringContaining('status'),
        expect.objectContaining({ status: TaskStatus.IN_PROGRESS }),
      );
    });

    it('returns PaginatedResponseDto with correct shape', async () => {
      acl.isOwner.mockReturnValue(true);
      const deptQb = makeQb([{ id: 'dept-id' }]);
      const tasks = [makeTask(), makeTask()];
      const taskQb = makeQb(null);
      taskQb['getManyAndCount'] = jest.fn().mockResolvedValue([tasks, 2]);
      deptRepo.createQueryBuilder.mockReturnValue(deptQb);
      taskRepo.createQueryBuilder.mockReturnValue(taskQb);
      const result = await service.findAll(makeUser(), { page: 2, limit: 10 });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
    });
  });

  // ── findOne() ─────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('throws NotFoundException when task not found', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(makeUser(), 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user cannot access the task', async () => {
      taskRepo.findOne.mockResolvedValue(makeTask());
      acl.canAccessTask.mockResolvedValue(false);
      await expect(service.findOne(makeUser(), 'task-id')).rejects.toThrow(ForbiddenException);
    });

    it('returns the task when access is granted', async () => {
      const task = makeTask();
      taskRepo.findOne.mockResolvedValue(task);
      acl.canAccessTask.mockResolvedValue(true);
      const result = await service.findOne(makeUser(), 'task-id');
      expect(result).toBe(task);
    });
  });

  // ── update() ──────────────────────────────────────────────────────────────

  describe('update()', () => {
    const dto: UpdateTaskDto = { title: 'Updated Title' };

    it('throws NotFoundException when task not found', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      await expect(service.update(makeUser(), 'bad-id', dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user cannot modify the task', async () => {
      taskRepo.findOne.mockResolvedValue(makeTask());
      acl.canModifyTask.mockResolvedValue(false);
      await expect(service.update(makeUser(), 'task-id', dto)).rejects.toThrow(ForbiddenException);
    });

    it('applies dto fields to the task and saves', async () => {
      const task = makeTask();
      taskRepo.findOne
        .mockResolvedValueOnce(task)
        .mockResolvedValueOnce({ ...task, title: 'Updated Title' });
      acl.canModifyTask.mockResolvedValue(true);
      await service.update(makeUser(), 'task-id', dto);
      expect(task.title).toBe('Updated Title');
      expect(taskRepo.save).toHaveBeenCalledWith(task);
    });

    it('clears the assignedTo relation when assignedToId is in the dto', async () => {
      const task = makeTask({ assignedTo: { id: 'old-user' } as User });
      taskRepo.findOne
        .mockResolvedValueOnce(task)
        .mockResolvedValueOnce(task);
      acl.canModifyTask.mockResolvedValue(true);
      await service.update(makeUser(), 'task-id', { assignedToId: 'new-user' });
      expect(task.assignedTo).toBeNull();
    });

    it('does NOT clear the assignedTo relation when assignedToId is not in the dto', async () => {
      const assignedUser = { id: 'existing-user' } as User;
      const task = makeTask({ assignedTo: assignedUser });
      taskRepo.findOne
        .mockResolvedValueOnce(task)
        .mockResolvedValueOnce(task);
      acl.canModifyTask.mockResolvedValue(true);
      await service.update(makeUser(), 'task-id', { title: 'Only title' });
      expect(task.assignedTo).toBe(assignedUser);
    });

    it('returns the refreshed task with relations', async () => {
      const task = makeTask();
      const refreshed = makeTask({ title: 'Updated' });
      taskRepo.findOne.mockResolvedValueOnce(task).mockResolvedValueOnce(refreshed);
      acl.canModifyTask.mockResolvedValue(true);
      const result = await service.update(makeUser(), 'task-id', dto);
      expect(result).toBe(refreshed);
    });
  });

  // ── reorder() ─────────────────────────────────────────────────────────────

  describe('reorder()', () => {
    const dto: ReorderTaskDto = { status: TaskStatus.IN_PROGRESS, position: 2 };

    it('throws NotFoundException when task not found', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      await expect(service.reorder(makeUser(), 'bad-id', dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user cannot modify the task', async () => {
      taskRepo.findOne.mockResolvedValue(makeTask());
      acl.canModifyTask.mockResolvedValue(false);
      await expect(service.reorder(makeUser(), 'task-id', dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when Viewer tries to reorder', async () => {
      taskRepo.findOne.mockResolvedValue(makeTask());
      acl.canModifyTask.mockResolvedValue(true);
      acl.isOwner.mockReturnValue(false);
      acl.getUserRoleForDepartment.mockResolvedValue(UserRole.VIEWER);
      await expect(
        service.reorder(makeUser({ isOwner: false }), 'task-id', dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Owner can reorder without role check', async () => {
      const task = makeTask();
      taskRepo.findOne.mockResolvedValueOnce(task).mockResolvedValueOnce(task);
      acl.canModifyTask.mockResolvedValue(true);
      acl.isOwner.mockReturnValue(true);
      await service.reorder(makeUser(), 'task-id', dto);
      expect(acl.getUserRoleForDepartment).not.toHaveBeenCalled();
      expect(taskRepo.save).toHaveBeenCalled();
    });

    it('Admin can reorder tasks in their department', async () => {
      const task = makeTask();
      taskRepo.findOne.mockResolvedValueOnce(task).mockResolvedValueOnce(task);
      acl.canModifyTask.mockResolvedValue(true);
      acl.isOwner.mockReturnValue(false);
      acl.getUserRoleForDepartment.mockResolvedValue(UserRole.ADMIN);
      await service.reorder(makeUser({ isOwner: false }), 'task-id', dto);
      expect(taskRepo.save).toHaveBeenCalled();
    });

    it('updates task status and position from dto', async () => {
      const task = makeTask();
      taskRepo.findOne.mockResolvedValueOnce(task).mockResolvedValueOnce(task);
      acl.canModifyTask.mockResolvedValue(true);
      acl.isOwner.mockReturnValue(true);
      await service.reorder(makeUser(), 'task-id', dto);
      expect(task.status).toBe(TaskStatus.IN_PROGRESS);
      expect(task.position).toBe(2);
    });
  });

  // ── remove() ──────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('throws NotFoundException when task not found', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(makeUser(), 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user cannot modify the task', async () => {
      taskRepo.findOne.mockResolvedValue(makeTask());
      acl.canModifyTask.mockResolvedValue(false);
      await expect(service.remove(makeUser(), 'task-id')).rejects.toThrow(ForbiddenException);
    });

    it('calls softRemove on the task', async () => {
      const task = makeTask();
      taskRepo.findOne.mockResolvedValue(task);
      acl.canModifyTask.mockResolvedValue(true);
      await service.remove(makeUser(), 'task-id');
      expect(taskRepo.softRemove).toHaveBeenCalledWith(task);
    });

    it('returns the task after soft delete', async () => {
      const task = makeTask();
      taskRepo.findOne.mockResolvedValue(task);
      acl.canModifyTask.mockResolvedValue(true);
      const result = await service.remove(makeUser(), 'task-id');
      expect(result).toBe(task);
    });
  });
});
