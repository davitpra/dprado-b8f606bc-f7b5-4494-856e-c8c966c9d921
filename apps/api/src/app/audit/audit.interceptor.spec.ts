import { lastValueFrom, of, throwError } from 'rxjs';
import { ForbiddenException } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';

import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

type FakeRequest = {
  method: string;
  url: string;
  params: Record<string, string>;
  body: Record<string, unknown>;
  headers: Record<string, string>;
  socket: { remoteAddress?: string };
  user?: { id: string };
  [key: string]: unknown;
};

function makeReq(overrides: Partial<FakeRequest> = {}): FakeRequest {
  return {
    method: 'POST',
    url: '/api/tasks',
    params: {},
    body: {},
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
    user: { id: 'user-id' },
    ...overrides,
  };
}

function makeCtx(req: FakeRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function makeNext(body: unknown = { id: 'res-id' }): CallHandler {
  return { handle: () => of(body) };
}

function makeErrNext(err: Error): CallHandler {
  return { handle: () => throwError(() => err) };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('AuditInterceptor (unit)', () => {
  let interceptor: AuditInterceptor;
  let auditService: { log: jest.Mock };

  beforeEach(() => {
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    interceptor = new AuditInterceptor(auditService as unknown as AuditService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── Skip conditions ───────────────────────────────────────────────────────

  describe('skip conditions — passes through without logging', () => {
    it('GET requests are never audited', async () => {
      const req = makeReq({ method: 'GET', url: '/api/tasks' });
      await lastValueFrom(interceptor.intercept(makeCtx(req), makeNext()));
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('/api/auth/* routes are skipped', async () => {
      const req = makeReq({ method: 'POST', url: '/api/auth/login' });
      await lastValueFrom(interceptor.intercept(makeCtx(req), makeNext()));
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('/api/audit-log routes are skipped', async () => {
      const req = makeReq({ method: 'GET', url: '/api/audit-log' });
      await lastValueFrom(interceptor.intercept(makeCtx(req), makeNext()));
      expect(auditService.log).not.toHaveBeenCalled();
    });
  });

  // ── mapMethodToAction ─────────────────────────────────────────────────────

  describe('mapMethodToAction — HTTP method → audit action', () => {
    it('POST → "create"', async () => {
      const req = makeReq({ method: 'POST', url: '/api/departments', body: {} });
      await lastValueFrom(interceptor.intercept(makeCtx(req), makeNext({ id: 'dept-1' })));
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'create' }),
      );
    });

    it('PUT → "update"', async () => {
      const req = makeReq({ method: 'PUT', url: '/api/tasks/task-1', params: { id: 'task-1' } });
      await lastValueFrom(interceptor.intercept(makeCtx(req), makeNext({ id: 'task-1', departmentId: 'dept-a' })));
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'update' }),
      );
    });

    it('PATCH → "update"', async () => {
      const req = makeReq({ method: 'PATCH', url: '/api/tasks/task-1/reorder', params: { id: 'task-1' } });
      await lastValueFrom(interceptor.intercept(makeCtx(req), makeNext({ id: 'task-1', departmentId: 'dept-a' })));
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'update' }),
      );
    });

    it('DELETE → "delete"', async () => {
      const req = makeReq({ method: 'DELETE', url: '/api/tasks/task-1', params: { id: 'task-1' } });
      await lastValueFrom(interceptor.intercept(makeCtx(req), makeNext({ id: 'task-1', departmentId: 'dept-a' })));
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'delete' }),
      );
    });
  });

  // ── deriveResource ────────────────────────────────────────────────────────

  describe('deriveResource — URL → resource name', () => {
    async function getResource(url: string, method = 'POST'): Promise<string> {
      const req = makeReq({ method, url, body: { departmentId: 'dept-a' } });
      await lastValueFrom(interceptor.intercept(makeCtx(req), makeNext({ id: 'res-1' })));
      const call = auditService.log.mock.calls[0][0] as { resource: string };
      return call.resource;
    }

    it('/api/tasks → "task"', async () => {
      expect(await getResource('/api/tasks')).toBe('task');
    });

    it('/api/tasks/123 → "task"', async () => {
      expect(await getResource('/api/tasks/123', 'DELETE')).toBe('task');
    });

    it('/api/departments → "department"', async () => {
      expect(await getResource('/api/departments')).toBe('department');
    });

    it('/api/departments/:id/members → "member"', async () => {
      expect(await getResource('/api/departments/dept-1/members')).toBe('member');
    });

    it('/api/organizations/me/users → "organization"', async () => {
      expect(await getResource('/api/organizations/me/users')).toBe('organization');
    });

    it('URL with query params: strips them before parsing', async () => {
      expect(await getResource('/api/tasks?status=todo')).toBe('task');
    });
  });

  // ── resourceId resolution ─────────────────────────────────────────────────

  describe('resourceId resolution', () => {
    it('create (POST): uses response body id', async () => {
      const req = makeReq({ method: 'POST', url: '/api/tasks', body: { departmentId: 'dept-a' } });
      await lastValueFrom(
        interceptor.intercept(makeCtx(req), makeNext({ id: 'new-task-id' })),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ resourceId: 'new-task-id' }),
      );
    });

    it('update (PUT): uses params.id', async () => {
      const req = makeReq({
        method: 'PUT',
        url: '/api/tasks/task-99',
        params: { id: 'task-99' },
      });
      await lastValueFrom(
        interceptor.intercept(makeCtx(req), makeNext({ id: 'task-99', departmentId: 'dept-a' })),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ resourceId: 'task-99' }),
      );
    });

    it('delete (DELETE): uses params.id', async () => {
      const req = makeReq({
        method: 'DELETE',
        url: '/api/tasks/task-42',
        params: { id: 'task-42' },
      });
      await lastValueFrom(
        interceptor.intercept(makeCtx(req), makeNext({ id: 'task-42', departmentId: 'dept-a' })),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ resourceId: 'task-42' }),
      );
    });
  });

  // ── departmentId resolution ───────────────────────────────────────────────

  describe('departmentId in details — resolution priority', () => {
    it('uses body.departmentId', async () => {
      const req = makeReq({
        body: { departmentId: 'dept-from-body' },
      });
      await lastValueFrom(interceptor.intercept(makeCtx(req), makeNext({ id: 'x' })));
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({ departmentId: 'dept-from-body' }),
        }),
      );
    });

    it('uses params.departmentId (members route)', async () => {
      const req = makeReq({
        url: '/api/departments/dept-from-params/members',
        params: { departmentId: 'dept-from-params' },
        body: {},
      });
      await lastValueFrom(interceptor.intercept(makeCtx(req), makeNext({ id: 'x' })));
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({ departmentId: 'dept-from-params' }),
        }),
      );
    });

    it('falls back to response body departmentId for task update', async () => {
      const req = makeReq({
        method: 'PUT',
        url: '/api/tasks/task-1',
        params: { id: 'task-1' },
        body: {},
      });
      await lastValueFrom(
        interceptor.intercept(makeCtx(req), makeNext({ id: 'task-1', departmentId: 'dept-from-response' })),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({ departmentId: 'dept-from-response' }),
        }),
      );
    });

    it('department create: uses response id as its own departmentId', async () => {
      const req = makeReq({
        method: 'POST',
        url: '/api/departments',
        body: {},
      });
      await lastValueFrom(
        interceptor.intercept(makeCtx(req), makeNext({ id: 'dept-new-id' })),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({ departmentId: 'dept-new-id' }),
        }),
      );
    });

    it('department update: uses params.id as departmentId', async () => {
      const req = makeReq({
        method: 'PUT',
        url: '/api/departments/dept-existing',
        params: { id: 'dept-existing' },
        body: {},
      });
      await lastValueFrom(
        interceptor.intercept(makeCtx(req), makeNext({ id: 'dept-existing', name: 'Eng' })),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({ departmentId: 'dept-existing' }),
        }),
      );
    });
  });

  // ── Sensitive data ────────────────────────────────────────────────────────

  describe('sensitive data stripping', () => {
    it('strips password from logged body details', async () => {
      const req = makeReq({
        method: 'POST',
        url: '/api/organizations/me/users',
        body: {
          email: 'new@test.com',
          password: 'SuperSecret!',
          firstName: 'New',
        },
      });
      await lastValueFrom(interceptor.intercept(makeCtx(req), makeNext({ id: 'user-new' })));
      const loggedDetails = auditService.log.mock.calls[0][0].details as Record<string, unknown>;
      expect(loggedDetails.body).not.toHaveProperty('password');
      expect((loggedDetails.body as Record<string, unknown>).email).toBe('new@test.com');
    });
  });

  // ── ipAddress resolution ──────────────────────────────────────────────────

  describe('ipAddress resolution', () => {
    it('prefers x-forwarded-for header', async () => {
      const req = makeReq({
        headers: { 'x-forwarded-for': '203.0.113.1' },
        body: { departmentId: 'dept-a' },
      });
      await lastValueFrom(interceptor.intercept(makeCtx(req), makeNext({ id: 'x' })));
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: '203.0.113.1' }),
      );
    });

    it('falls back to socket.remoteAddress', async () => {
      const req = makeReq({
        headers: {},
        socket: { remoteAddress: '10.0.0.1' },
        body: { departmentId: 'dept-a' },
      });
      await lastValueFrom(interceptor.intercept(makeCtx(req), makeNext({ id: 'x' })));
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: '10.0.0.1' }),
      );
    });
  });

  // ── userId resolution ─────────────────────────────────────────────────────

  describe('userId resolution', () => {
    it('uses request.user.id when authenticated', async () => {
      const req = makeReq({ user: { id: 'auth-user-id' }, body: { departmentId: 'd' } });
      await lastValueFrom(interceptor.intercept(makeCtx(req), makeNext({ id: 'x' })));
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'auth-user-id' }),
      );
    });

    it('falls back to "anonymous" when no user on request', async () => {
      const req = makeReq({ user: undefined, body: { departmentId: 'd' } });
      await lastValueFrom(interceptor.intercept(makeCtx(req), makeNext({ id: 'x' })));
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'anonymous' }),
      );
    });
  });

  // ── access_denied logging ─────────────────────────────────────────────────

  describe('access_denied — ForbiddenException logging', () => {
    it('logs access_denied when authenticated user gets ForbiddenException', async () => {
      const req = makeReq({
        method: 'DELETE',
        url: '/api/tasks/task-1',
        params: { id: 'task-1' },
        user: { id: 'viewer-id' },
      });
      const err = new ForbiddenException('no access');

      await expect(
        lastValueFrom(interceptor.intercept(makeCtx(req), makeErrNext(err))),
      ).rejects.toThrow(ForbiddenException);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'access_denied',
          userId: 'viewer-id',
        }),
      );
    });

    it('does NOT log access_denied for anonymous users', async () => {
      const req = makeReq({
        method: 'POST',
        url: '/api/tasks',
        user: undefined,
      });
      const err = new ForbiddenException('no access');

      await expect(
        lastValueFrom(interceptor.intercept(makeCtx(req), makeErrNext(err))),
      ).rejects.toThrow(ForbiddenException);

      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('re-throws the original error after logging access_denied', async () => {
      const req = makeReq({ user: { id: 'u' }, body: {} });
      const err = new ForbiddenException('denied');

      const result$ = interceptor.intercept(makeCtx(req), makeErrNext(err));
      await expect(lastValueFrom(result$)).rejects.toThrow(ForbiddenException);
    });

    it('does NOT log access_denied for non-Forbidden errors', async () => {
      const req = makeReq({ user: { id: 'u' }, body: {} });
      const err = new Error('internal error');

      await expect(
        lastValueFrom(interceptor.intercept(makeCtx(req), makeErrNext(err))),
      ).rejects.toThrow('internal error');

      expect(auditService.log).not.toHaveBeenCalled();
    });
  });
});
