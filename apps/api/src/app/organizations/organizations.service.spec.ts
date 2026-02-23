import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRole } from '@task-management/data';

import { OrganizationsService } from './organizations.service';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import type { CreateOrgUserDto } from '@task-management/data/dto';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeOwner(orgId = 'org-id'): User {
  const u: Record<string, unknown> = {
    id: 'owner-id',
    organizationId: orgId,
    roles: [{ role: UserRole.OWNER, departmentId: null }],
  };
  Object.defineProperty(u, 'isOwner', { get: () => true });
  return u as unknown as User;
}

function makeAdmin(): User {
  const u: Record<string, unknown> = {
    id: 'admin-id',
    organizationId: 'org-id',
    roles: [{ role: UserRole.ADMIN, departmentId: 'dept-id' }],
  };
  Object.defineProperty(u, 'isOwner', { get: () => false });
  return u as unknown as User;
}

function makeOrg(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'org-id',
    name: 'Acme Corp',
    departments: [],
    users: [],
    ...overrides,
  } as unknown as Organization;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('OrganizationsService (unit)', () => {
  let service: OrganizationsService;
  let orgRepo: { findOne: jest.Mock };
  let userRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    orgRepo = { findOne: jest.fn() };
    userRepo = {
      findOne: jest.fn(),
      create: jest.fn((d) => ({ ...d })),
      save: jest.fn((e) => Promise.resolve({ id: 'new-user-id', ...e })),
    };

    const module = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: getRepositoryToken(Organization), useValue: orgRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get(OrganizationsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── getByUser() ───────────────────────────────────────────────────────────

  describe('getByUser()', () => {
    it('throws NotFoundException when organization not found', async () => {
      orgRepo.findOne.mockResolvedValue(null);
      await expect(service.getByUser('org-id')).rejects.toThrow(NotFoundException);
    });

    it('returns organization with departments relation', async () => {
      const org = makeOrg({ departments: [] });
      orgRepo.findOne.mockResolvedValue(org);
      const result = await service.getByUser('org-id');
      expect(orgRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ relations: ['departments'] }),
      );
      expect(result).toBe(org);
    });
  });

  // ── getUsersForOrg() ──────────────────────────────────────────────────────

  describe('getUsersForOrg()', () => {
    it('throws NotFoundException when organization not found', async () => {
      orgRepo.findOne.mockResolvedValue(null);
      await expect(service.getUsersForOrg('org-id')).rejects.toThrow(NotFoundException);
    });

    it('returns the organization users array', async () => {
      const users = [makeOwner(), makeAdmin()];
      orgRepo.findOne.mockResolvedValue(makeOrg({ users } as Partial<Organization>));
      const result = await service.getUsersForOrg('org-id');
      expect(orgRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ relations: ['users', 'users.roles'] }),
      );
      expect(result).toEqual(users);
    });
  });

  // ── createUser() ──────────────────────────────────────────────────────────

  describe('createUser()', () => {
    const dto: CreateOrgUserDto = {
      email: 'new@test.com',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
    };

    it('throws ForbiddenException when caller is not owner', async () => {
      await expect(service.createUser(makeAdmin(), dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when email already exists', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'existing-id' });
      await expect(service.createUser(makeOwner(), dto)).rejects.toThrow(ConflictException);
    });

    it('creates user scoped to owner organization', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await service.createUser(makeOwner('my-org'), dto);
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: dto.email,
          organizationId: 'my-org',
        }),
      );
    });

    it('returns the saved user', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const result = await service.createUser(makeOwner(), dto);
      expect(result).toHaveProperty('id');
      expect(userRepo.save).toHaveBeenCalled();
    });
  });
});
