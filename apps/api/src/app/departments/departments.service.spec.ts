import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRole } from '@task-management/data';

import { DepartmentsService } from './departments.service';
import { Department } from '../entities/department.entity';
import { AccessControlService } from '../access-control/access-control.service';
import type { User } from '../entities/user.entity';
import type { CreateDepartmentDto, UpdateDepartmentDto } from '@task-management/data/dto';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(isOwner = true, orgId = 'org-id'): User {
  const u: Record<string, unknown> = {
    id: 'user-id',
    organizationId: orgId,
    roles: isOwner
      ? [{ role: UserRole.OWNER, departmentId: null }]
      : [{ role: UserRole.ADMIN, departmentId: 'dept-id' }],
  };
  Object.defineProperty(u, 'isOwner', { get: () => isOwner });
  return u as unknown as User;
}

function makeDept(overrides: Partial<Department> = {}): Department {
  return {
    id: 'dept-id',
    name: 'Engineering',
    organizationId: 'org-id',
    description: null,
    ...overrides,
  } as Department;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('DepartmentsService (unit)', () => {
  let service: DepartmentsService;
  let deptRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };
  let acl: jest.Mocked<Pick<AccessControlService, 'isOwner' | 'getUserDepartments'>>;

  beforeEach(async () => {
    deptRepo = {
      create: jest.fn((d) => ({ ...d })),
      save: jest.fn((e) => Promise.resolve({ id: 'dept-id', ...e })),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    acl = { isOwner: jest.fn(), getUserDepartments: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: getRepositoryToken(Department), useValue: deptRepo },
        { provide: AccessControlService, useValue: acl },
      ],
    }).compile();

    service = module.get(DepartmentsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create() ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    const dto: CreateDepartmentDto = { name: 'Engineering' };

    it('throws ForbiddenException when user is not owner', async () => {
      acl.isOwner.mockReturnValue(false);
      await expect(service.create(makeUser(false), dto)).rejects.toThrow(ForbiddenException);
    });

    it('creates department scoped to user organization', async () => {
      acl.isOwner.mockReturnValue(true);
      await service.create(makeUser(true), dto);
      expect(deptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Engineering', organizationId: 'org-id' }),
      );
      expect(deptRepo.save).toHaveBeenCalled();
    });

    it('stores description when provided', async () => {
      acl.isOwner.mockReturnValue(true);
      await service.create(makeUser(), { name: 'Eng', description: 'Dev team' });
      expect(deptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Dev team' }),
      );
    });

    it('stores null description when omitted', async () => {
      acl.isOwner.mockReturnValue(true);
      await service.create(makeUser(), { name: 'Eng' });
      expect(deptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: null }),
      );
    });
  });

  // ── findAll() ─────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('Owner: returns all departments in the organization', async () => {
      acl.isOwner.mockReturnValue(true);
      const depts = [makeDept()];
      deptRepo.find.mockResolvedValue(depts);
      const result = await service.findAll(makeUser(true));
      expect(deptRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-id' } }),
      );
      expect(result).toEqual(depts);
    });

    it('Non-owner: delegates to acl.getUserDepartments', async () => {
      acl.isOwner.mockReturnValue(false);
      const depts = [makeDept()];
      acl.getUserDepartments.mockResolvedValue(depts);
      const result = await service.findAll(makeUser(false));
      expect(acl.getUserDepartments).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(depts);
      expect(deptRepo.find).not.toHaveBeenCalled();
    });
  });

  // ── update() ──────────────────────────────────────────────────────────────

  describe('update()', () => {
    const dto: UpdateDepartmentDto = { name: 'Platform' };

    it('throws ForbiddenException when user is not owner', async () => {
      acl.isOwner.mockReturnValue(false);
      await expect(service.update(makeUser(false), 'dept-id', dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when department does not exist', async () => {
      acl.isOwner.mockReturnValue(true);
      deptRepo.findOne.mockResolvedValue(null);
      await expect(service.update(makeUser(), 'bad-id', dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when department belongs to another org', async () => {
      acl.isOwner.mockReturnValue(true);
      deptRepo.findOne.mockResolvedValue(makeDept({ organizationId: 'other-org' }));
      await expect(service.update(makeUser(), 'dept-id', dto)).rejects.toThrow(ForbiddenException);
    });

    it('applies dto fields and saves', async () => {
      acl.isOwner.mockReturnValue(true);
      const dept = makeDept();
      deptRepo.findOne.mockResolvedValue(dept);
      await service.update(makeUser(), 'dept-id', dto);
      expect(dept.name).toBe('Platform');
      expect(deptRepo.save).toHaveBeenCalledWith(dept);
    });
  });

  // ── remove() ──────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('throws ForbiddenException when user is not owner', async () => {
      acl.isOwner.mockReturnValue(false);
      await expect(service.remove(makeUser(false), 'dept-id')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when department does not exist', async () => {
      acl.isOwner.mockReturnValue(true);
      deptRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(makeUser(), 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when department belongs to another org', async () => {
      acl.isOwner.mockReturnValue(true);
      deptRepo.findOne.mockResolvedValue(makeDept({ organizationId: 'other-org' }));
      await expect(service.remove(makeUser(), 'dept-id')).rejects.toThrow(ForbiddenException);
    });

    it('removes the department', async () => {
      acl.isOwner.mockReturnValue(true);
      const dept = makeDept();
      deptRepo.findOne.mockResolvedValue(dept);
      await service.remove(makeUser(), 'dept-id');
      expect(deptRepo.remove).toHaveBeenCalledWith(dept);
    });
  });
});
