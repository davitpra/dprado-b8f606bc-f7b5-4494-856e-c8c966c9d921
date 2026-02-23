import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRole } from '@task-management/data';

import { DepartmentMembersService } from './department-members.service';
import { Department } from '../entities/department.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { AccessControlService } from '../access-control/access-control.service';
import { User } from '../entities/user.entity';
import type { InviteMemberDto, UpdateMemberDto } from '@task-management/data/dto';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(opts: {
  id?: string;
  isOwner?: boolean;
  orgId?: string;
} = {}): User {
  const { id = 'actor-id', isOwner = true, orgId = 'org-id' } = opts;
  const u: Record<string, unknown> = { id, organizationId: orgId };
  Object.defineProperty(u, 'isOwner', { get: () => isOwner });
  return u as unknown as User;
}

function makeTargetUser(opts: {
  id?: string;
  isOwner?: boolean;
  orgId?: string;
} = {}): User {
  const { id = 'target-id', isOwner = false, orgId = 'org-id' } = opts;
  const u: Record<string, unknown> = { id, organizationId: orgId, roles: [] };
  Object.defineProperty(u, 'isOwner', { get: () => isOwner });
  return u as unknown as User;
}

function makeDept(orgId = 'org-id'): Department {
  return { id: 'dept-id', name: 'Engineering', organizationId: orgId } as Department;
}

function makeRole(role: UserRole, userId = 'target-id'): UserRoleEntity {
  return { id: 'role-id', userId, departmentId: 'dept-id', role } as UserRoleEntity;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('DepartmentMembersService (unit)', () => {
  let service: DepartmentMembersService;
  let userRoleRepo: {
    findOne: jest.Mock;
    findOneOrFail: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let deptRepo: { findOne: jest.Mock };
  let userRepo: { findOne: jest.Mock };
  let acl: jest.Mocked<
    Pick<
      AccessControlService,
      'isOwner' | 'getUserRoleForDepartment' | 'canManageDepartmentMembers'
    >
  >;

  beforeEach(async () => {
    userRoleRepo = {
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      find: jest.fn(),
      create: jest.fn((d) => ({ ...d })),
      save: jest.fn((e) => Promise.resolve({ id: 'role-id', ...e })),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    deptRepo = { findOne: jest.fn() };
    userRepo = { findOne: jest.fn() };
    acl = {
      isOwner: jest.fn(),
      getUserRoleForDepartment: jest.fn(),
      canManageDepartmentMembers: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        DepartmentMembersService,
        { provide: getRepositoryToken(UserRoleEntity), useValue: userRoleRepo },
        { provide: getRepositoryToken(Department), useValue: deptRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: AccessControlService, useValue: acl },
      ],
    }).compile();

    service = module.get(DepartmentMembersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── invite() ──────────────────────────────────────────────────────────────

  describe('invite()', () => {
    const dto: InviteMemberDto = { userId: 'target-id', role: UserRole.VIEWER };

    it('throws NotFoundException when department not found', async () => {
      deptRepo.findOne.mockResolvedValue(null);
      await expect(service.invite(makeUser(), 'dept-id', dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when dept belongs to another org', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept('other-org'));
      await expect(service.invite(makeUser(), 'dept-id', dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when canManage returns false', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.canManageDepartmentMembers.mockResolvedValue(false);
      await expect(service.invite(makeUser(), 'dept-id', dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when target user not found', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.canManageDepartmentMembers.mockResolvedValue(true);
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.invite(makeUser(), 'dept-id', dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when target user belongs to another org', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.canManageDepartmentMembers.mockResolvedValue(true);
      userRepo.findOne.mockResolvedValue(makeTargetUser({ orgId: 'other-org' }));
      await expect(service.invite(makeUser(), 'dept-id', dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when target is the org owner', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.canManageDepartmentMembers.mockResolvedValue(true);
      userRepo.findOne.mockResolvedValue(makeTargetUser({ isOwner: true }));
      await expect(service.invite(makeUser(), 'dept-id', dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when user already has a role in dept', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.canManageDepartmentMembers.mockResolvedValue(true);
      userRepo.findOne.mockResolvedValue(makeTargetUser());
      userRoleRepo.findOne.mockResolvedValue(makeRole(UserRole.VIEWER));
      await expect(service.invite(makeUser(), 'dept-id', dto)).rejects.toThrow(ConflictException);
    });

    it('creates and returns the new UserRole on success', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.canManageDepartmentMembers.mockResolvedValue(true);
      userRepo.findOne.mockResolvedValue(makeTargetUser());
      userRoleRepo.findOne.mockResolvedValue(null);
      const saved = makeRole(UserRole.VIEWER);
      userRoleRepo.findOneOrFail.mockResolvedValue(saved);
      const result = await service.invite(makeUser(), 'dept-id', dto);
      expect(userRoleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'target-id', role: UserRole.VIEWER }),
      );
      expect(result).toBe(saved);
    });
  });

  // ── findAll() ─────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('throws NotFoundException when department not found', async () => {
      deptRepo.findOne.mockResolvedValue(null);
      await expect(service.findAll(makeUser(), 'dept-id')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for Viewer role', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.isOwner.mockReturnValue(false);
      acl.getUserRoleForDepartment.mockResolvedValue(UserRole.VIEWER);
      await expect(service.findAll(makeUser({ isOwner: false }), 'dept-id')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when user has no role in dept', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.isOwner.mockReturnValue(false);
      acl.getUserRoleForDepartment.mockResolvedValue(null);
      await expect(service.findAll(makeUser({ isOwner: false }), 'dept-id')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('Owner bypasses role check and returns all members', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.isOwner.mockReturnValue(true);
      const roles = [makeRole(UserRole.ADMIN), makeRole(UserRole.VIEWER)];
      userRoleRepo.find.mockResolvedValue(roles);
      const result = await service.findAll(makeUser(), 'dept-id');
      expect(acl.getUserRoleForDepartment).not.toHaveBeenCalled();
      expect(result).toEqual(roles);
    });

    it('Admin can list members', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.isOwner.mockReturnValue(false);
      acl.getUserRoleForDepartment.mockResolvedValue(UserRole.ADMIN);
      const roles = [makeRole(UserRole.VIEWER)];
      userRoleRepo.find.mockResolvedValue(roles);
      const result = await service.findAll(makeUser({ isOwner: false }), 'dept-id');
      expect(result).toEqual(roles);
    });
  });

  // ── remove() ──────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('throws NotFoundException when target member not found', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      userRoleRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(makeUser(), 'dept-id', 'target-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Owner can remove any member', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      userRoleRepo.findOne.mockResolvedValue(makeRole(UserRole.ADMIN));
      acl.isOwner.mockReturnValue(true);
      await service.remove(makeUser(), 'dept-id', 'target-id');
      expect(userRoleRepo.remove).toHaveBeenCalled();
    });

    it('throws ForbiddenException when non-admin tries to remove', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      userRoleRepo.findOne.mockResolvedValue(makeRole(UserRole.VIEWER));
      acl.isOwner.mockReturnValue(false);
      acl.getUserRoleForDepartment.mockResolvedValue(UserRole.VIEWER);
      await expect(service.remove(makeUser({ isOwner: false }), 'dept-id', 'target-id')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('Admin cannot remove another Admin', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      userRoleRepo.findOne.mockResolvedValue(makeRole(UserRole.ADMIN));
      acl.isOwner.mockReturnValue(false);
      acl.getUserRoleForDepartment.mockResolvedValue(UserRole.ADMIN);
      await expect(service.remove(makeUser({ isOwner: false }), 'dept-id', 'target-id')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('Admin can remove a Viewer', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      const viewerRole = makeRole(UserRole.VIEWER);
      userRoleRepo.findOne.mockResolvedValue(viewerRole);
      acl.isOwner.mockReturnValue(false);
      acl.getUserRoleForDepartment.mockResolvedValue(UserRole.ADMIN);
      await service.remove(makeUser({ isOwner: false }), 'dept-id', 'target-id');
      expect(userRoleRepo.remove).toHaveBeenCalledWith(viewerRole);
    });
  });

  // ── updateRole() ──────────────────────────────────────────────────────────

  describe('updateRole()', () => {
    const dto: UpdateMemberDto = { role: UserRole.ADMIN };

    it('throws ForbiddenException when user is not owner', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.isOwner.mockReturnValue(false);
      await expect(
        service.updateRole(makeUser({ isOwner: false }), 'dept-id', 'target-id', dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when target member not found', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.isOwner.mockReturnValue(true);
      userRoleRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateRole(makeUser(), 'dept-id', 'target-id', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates role and returns the updated UserRole', async () => {
      deptRepo.findOne.mockResolvedValue(makeDept());
      acl.isOwner.mockReturnValue(true);
      const targetRole = makeRole(UserRole.VIEWER);
      userRoleRepo.findOne.mockResolvedValue(targetRole);
      const updated = makeRole(UserRole.ADMIN);
      userRoleRepo.findOneOrFail.mockResolvedValue(updated);
      const result = await service.updateRole(makeUser(), 'dept-id', 'target-id', dto);
      expect(targetRole.role).toBe(UserRole.ADMIN);
      expect(userRoleRepo.save).toHaveBeenCalledWith(targetRole);
      expect(result).toBe(updated);
    });
  });
});
