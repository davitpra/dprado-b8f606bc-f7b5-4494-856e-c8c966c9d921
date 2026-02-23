import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRole } from '@task-management/data';
import { AuditLogFilterDto } from '@task-management/data/dto';

import { AuditService } from './audit.service';
import { AuditLog } from '../entities/audit-log.entity';
import { AccessControlService } from '../access-control/access-control.service';
import type { User } from '../entities/user.entity';
import type { Department } from '../entities/department.entity';

// ── Mock query builder ────────────────────────────────────────────────────────

function makeQb(items: Partial<AuditLog>[] = [], total = 0) {
  const qb: Record<string, jest.Mock> = {};
  const self = () => qb as unknown;
  [
    'leftJoinAndSelect',
    'orderBy',
    'where',
    'andWhere',
    'setParameter',
    'skip',
    'take',
  ].forEach((m) => (qb[m] = jest.fn(self)));
  qb['getManyAndCount'] = jest.fn().mockResolvedValue([items, total]);
  return qb;
}

// ── User factories ────────────────────────────────────────────────────────────

function makeOwner(orgId = 'org-id'): User {
  const u: Record<string, unknown> = {
    id: 'owner-id',
    organizationId: orgId,
    roles: [{ role: UserRole.OWNER, departmentId: null }],
  };
  Object.defineProperty(u, 'isOwner', { get: () => true });
  return u as unknown as User;
}

function makeAdmin(deptIds: string[] = ['dept-eng']): User {
  const u: Record<string, unknown> = {
    id: 'admin-id',
    organizationId: 'org-id',
    roles: deptIds.map((d) => ({ role: UserRole.ADMIN, departmentId: d })),
  };
  Object.defineProperty(u, 'isOwner', { get: () => false });
  return u as unknown as User;
}

function makeViewer(): User {
  const u: Record<string, unknown> = {
    id: 'viewer-id',
    organizationId: 'org-id',
    roles: [{ role: UserRole.VIEWER, departmentId: 'dept-eng' }],
  };
  Object.defineProperty(u, 'isOwner', { get: () => false });
  return u as unknown as User;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('AuditService (unit)', () => {
  let service: AuditService;
  let acl: jest.Mocked<Pick<AccessControlService, 'isOwner' | 'getUserAdminDepartments'>>;
  let auditRepo: { create: jest.Mock; save: jest.Mock; createQueryBuilder: jest.Mock };
  let qb: ReturnType<typeof makeQb>;

  beforeEach(async () => {
    qb = makeQb();
    acl = { isOwner: jest.fn(), getUserAdminDepartments: jest.fn() };
    auditRepo = {
      create: jest.fn((p) => ({ ...p })),
      save: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn(() => qb),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: auditRepo },
        { provide: AccessControlService, useValue: acl },
      ],
    }).compile();

    service = module.get(AuditService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── log() ─────────────────────────────────────────────────────────────────

  describe('log()', () => {
    const params = {
      action: 'create',
      resource: 'task',
      resourceId: 'task-1',
      userId: 'user-1',
      ipAddress: '127.0.0.1',
      details: { departmentId: 'dept-a' },
    };

    it('creates and saves an audit log entry', async () => {
      await service.log(params);
      expect(auditRepo.create).toHaveBeenCalledWith(params);
      expect(auditRepo.save).toHaveBeenCalled();
    });

    it('swallows DB errors silently — never throws', async () => {
      auditRepo.save.mockRejectedValue(new Error('DB failure'));
      await expect(service.log(params)).resolves.toBeUndefined();
    });

    it('swallows create errors silently', async () => {
      auditRepo.create.mockImplementation(() => {
        throw new Error('create error');
      });
      await expect(service.log(params)).resolves.toBeUndefined();
    });
  });

  // ── findAll() — RBAC scoping ──────────────────────────────────────────────

  describe('findAll() — RBAC scoping', () => {
    it('Owner: scopes query to own organization', async () => {
      acl.isOwner.mockReturnValue(true);
      await service.findAll(makeOwner('my-org'), {});
      expect(qb.where).toHaveBeenCalledWith(
        'user.organizationId = :orgId',
        { orgId: 'my-org' },
      );
      expect(acl.getUserAdminDepartments).not.toHaveBeenCalled();
    });

    it('Admin with one department: filters by that dept in details JSON', async () => {
      acl.isOwner.mockReturnValue(false);
      acl.getUserAdminDepartments.mockResolvedValue([
        { id: 'dept-eng' } as Department,
      ]);
      await service.findAll(makeAdmin(['dept-eng']), {});
      expect(qb.setParameter).toHaveBeenCalledWith(
        'deptId0',
        '%"departmentId":"dept-eng"%',
      );
      expect(qb.where).toHaveBeenCalled();
    });

    it('Admin with multiple departments: builds OR condition', async () => {
      acl.isOwner.mockReturnValue(false);
      acl.getUserAdminDepartments.mockResolvedValue([
        { id: 'dept-eng' } as Department,
        { id: 'dept-mkt' } as Department,
      ]);
      await service.findAll(makeAdmin(['dept-eng', 'dept-mkt']), {});
      expect(qb.setParameter).toHaveBeenCalledWith(
        'deptId0',
        '%"departmentId":"dept-eng"%',
      );
      expect(qb.setParameter).toHaveBeenCalledWith(
        'deptId1',
        '%"departmentId":"dept-mkt"%',
      );
    });

    it('Viewer: throws ForbiddenException', async () => {
      acl.isOwner.mockReturnValue(false);
      acl.getUserAdminDepartments.mockResolvedValue([]);
      await expect(service.findAll(makeViewer(), {})).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── findAll() — optional filters ──────────────────────────────────────────

  describe('findAll() — optional filters', () => {
    beforeEach(() => acl.isOwner.mockReturnValue(true));

    it('dateFrom: applies >= timestamp condition', async () => {
      const filters: AuditLogFilterDto = { dateFrom: '2026-01-01T00:00:00.000Z' };
      await service.findAll(makeOwner(), filters);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'audit_log.timestamp >= :dateFrom',
        { dateFrom: '2026-01-01T00:00:00.000Z' },
      );
    });

    it('dateTo: applies <= timestamp condition', async () => {
      const filters: AuditLogFilterDto = { dateTo: '2026-12-31T23:59:59.999Z' };
      await service.findAll(makeOwner(), filters);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'audit_log.timestamp <= :dateTo',
        { dateTo: '2026-12-31T23:59:59.999Z' },
      );
    });

    it('userId: filters by acting user', async () => {
      const uid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
      const filters: AuditLogFilterDto = { userId: uid };
      await service.findAll(makeOwner(), filters);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'audit_log.userId = :userId',
        { userId: uid },
      );
    });

    it('action: filters by action type', async () => {
      const filters: AuditLogFilterDto = { action: 'delete' };
      await service.findAll(makeOwner(), filters);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'audit_log.action = :action',
        { action: 'delete' },
      );
    });

    it('resource: filters by resource type', async () => {
      const filters: AuditLogFilterDto = { resource: 'department' };
      await service.findAll(makeOwner(), filters);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'audit_log.resource = :resource',
        { resource: 'department' },
      );
    });

    it('departmentId: filters via LIKE on JSON details column', async () => {
      const deptId = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
      const filters: AuditLogFilterDto = { departmentId: deptId };
      await service.findAll(makeOwner(), filters);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'audit_log.details LIKE :deptFilter',
        { deptFilter: `%"departmentId":"${deptId}"%` },
      );
    });

    it('multiple filters: all applied independently', async () => {
      const filters: AuditLogFilterDto = { action: 'create', resource: 'task' };
      await service.findAll(makeOwner(), filters);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'audit_log.action = :action',
        { action: 'create' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'audit_log.resource = :resource',
        { resource: 'task' },
      );
    });

    it('no filters: no andWhere calls beyond the base where', async () => {
      await service.findAll(makeOwner(), {});
      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  // ── findAll() — pagination ────────────────────────────────────────────────

  describe('findAll() — pagination', () => {
    beforeEach(() => acl.isOwner.mockReturnValue(true));

    it('defaults to page=1, limit=20', async () => {
      await service.findAll(makeOwner(), {});
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });

    it('page=3, limit=10 → skip=20', async () => {
      await service.findAll(makeOwner(), { page: 3, limit: 10 });
      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('returns correct PaginatedResponseDto shape', async () => {
      const fakeItems = [{ id: 'log-1' } as AuditLog];
      qb.getManyAndCount.mockResolvedValue([fakeItems, 42]);
      const result = await service.findAll(makeOwner(), { page: 2, limit: 10 });
      expect(result.items).toEqual(fakeItems);
      expect(result.total).toBe(42);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5); // ceil(42/10)
    });

    it('totalPages rounds up correctly for partial last page', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 21]);
      const result = await service.findAll(makeOwner(), { page: 1, limit: 10 });
      expect(result.totalPages).toBe(3); // ceil(21/10)
    });
  });
});
