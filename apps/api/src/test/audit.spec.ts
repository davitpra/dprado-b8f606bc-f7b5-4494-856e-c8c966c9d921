import * as request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { TaskCategory, TaskPriority } from '@task-management/data';
import { createTestApp } from './helpers/app.helper';
import { seedTestData, getToken, SeedResult } from './helpers/seed.helper';

describe('Audit Log API (integration)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let seed: SeedResult;
  let tokens: {
    owner: string;
    adminEng: string;
    adminMkt: string;
    viewer1: string;
  };

  beforeAll(async () => {
    ({ app, moduleRef } = await createTestApp());
    seed = await seedTestData(moduleRef);
    tokens = {
      owner: await getToken(app, 'owner@test.com'),
      adminEng: await getToken(app, 'admin.eng@test.com'),
      adminMkt: await getToken(app, 'admin.mkt@test.com'),
      viewer1: await getToken(app, 'viewer1@test.com'),
    };

    // Generate audit entries for Engineering (owner creates task + dept)
    await request(app.getHttpServer())
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokens.owner}`)
      .send({
        title: 'Audit Test Task',
        category: TaskCategory.WORK,
        priority: TaskPriority.MEDIUM,
        departmentId: seed.engineering.id,
      });

    await request(app.getHttpServer())
      .post('/api/departments')
      .set('Authorization', `Bearer ${tokens.owner}`)
      .send({ name: 'Audit Test Dept' });

    // Generate audit entries for Marketing (adminMkt creates a task)
    await request(app.getHttpServer())
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tokens.adminMkt}`)
      .send({
        title: 'Marketing Audit Task',
        category: TaskCategory.WORK,
        priority: TaskPriority.LOW,
        departmentId: seed.marketing.id,
      });
  });

  afterAll(async () => {
    await app.close();
  });

  // ── GET /api/audit-log — RBAC ──────────────────────────────────────────────

  describe('GET /api/audit-log — access control', () => {
    it('Owner can access the audit log (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('Admin can access the audit log (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${tokens.adminEng}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
    });

    it('Viewer cannot access the audit log (403)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${tokens.viewer1}`);
      expect(res.status).toBe(403);
    });

    it('returns 401 without token', async () => {
      const res = await request(app.getHttpServer()).get('/api/audit-log');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/audit-log — Admin scoping ────────────────────────────────────

  describe('GET /api/audit-log — Admin department scoping', () => {
    it('adminEng only sees Engineering department entries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${tokens.adminEng}`);
      expect(res.status).toBe(200);
      const items = res.body.items as Array<{ details: Record<string, unknown> }>;
      // Every entry should belong to Engineering dept
      items.forEach((entry) => {
        expect(entry.details['departmentId']).toBe(seed.engineering.id);
      });
    });

    it('adminMkt only sees Marketing department entries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${tokens.adminMkt}`);
      expect(res.status).toBe(200);
      const items = res.body.items as Array<{ details: Record<string, unknown> }>;
      items.forEach((entry) => {
        expect(entry.details['departmentId']).toBe(seed.marketing.id);
      });
    });

    it('Owner sees entries from all departments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      const deptIds = new Set(
        (res.body.items as Array<{ details: Record<string, unknown> }>).map(
          (e) => e.details['departmentId'],
        ),
      );
      // Should see entries from both Engineering and Marketing
      expect(deptIds.has(seed.engineering.id)).toBe(true);
      expect(deptIds.has(seed.marketing.id)).toBe(true);
    });
  });

  // ── GET /api/audit-log — Pagination ───────────────────────────────────────

  describe('GET /api/audit-log — pagination', () => {
    it('supports page and limit query params', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-log?page=1&limit=5')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(5);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeLessThanOrEqual(5);
    });

    it('returns totalPages in the response', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-log?page=1&limit=1')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalPages');
      expect(res.body.totalPages).toBeGreaterThanOrEqual(1);
    });
  });

  // ── GET /api/audit-log — Filters ──────────────────────────────────────────

  describe('GET /api/audit-log — filters', () => {
    it('?action=create — only returns create entries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-log?action=create')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      const items = res.body.items as Array<{ action: string }>;
      expect(items.length).toBeGreaterThan(0);
      items.forEach((entry) => expect(entry.action).toBe('create'));
    });

    it('?resource=task — only returns task entries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-log?resource=task')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      const items = res.body.items as Array<{ resource: string }>;
      expect(items.length).toBeGreaterThan(0);
      items.forEach((entry) => expect(entry.resource).toBe('task'));
    });

    it('?resource=department — only returns department entries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-log?resource=department')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      const items = res.body.items as Array<{ resource: string }>;
      expect(items.length).toBeGreaterThan(0);
      items.forEach((entry) => expect(entry.resource).toBe('department'));
    });

    it('?userId=<ownerId> — only returns entries from that user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/audit-log?userId=${seed.owner.id}`)
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      const items = res.body.items as Array<{ userId: string }>;
      expect(items.length).toBeGreaterThan(0);
      items.forEach((entry) => expect(entry.userId).toBe(seed.owner.id));
    });

    it('?departmentId=<engId> — only returns Engineering entries', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/audit-log?departmentId=${seed.engineering.id}`)
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      const items = res.body.items as Array<{ details: Record<string, unknown> }>;
      expect(items.length).toBeGreaterThan(0);
      items.forEach((entry) =>
        expect(entry.details['departmentId']).toBe(seed.engineering.id),
      );
    });

    it('?action=create&resource=task — combined filters work together', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-log?action=create&resource=task')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      const items = res.body.items as Array<{ action: string; resource: string }>;
      expect(items.length).toBeGreaterThan(0);
      items.forEach((entry) => {
        expect(entry.action).toBe('create');
        expect(entry.resource).toBe('task');
      });
    });

    it('?dateFrom in the future — returns empty items list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-log?dateFrom=2099-01-01T00:00:00.000Z')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it('?dateTo in the past — returns empty items list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-log?dateTo=2000-01-01T00:00:00.000Z')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(0);
    });
  });

  // ── Audit entry shape ──────────────────────────────────────────────────────

  describe('audit entry shape', () => {
    it('entries contain expected fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-log?action=create&resource=task')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      const entry = res.body.items[0] as Record<string, unknown>;
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('resource');
      expect(entry).toHaveProperty('resourceId');
      expect(entry).toHaveProperty('userId');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('details');
    });

    it('entries do NOT expose user passwords', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${tokens.owner}`);
      const items = res.body.items as Array<{ details: Record<string, unknown> }>;
      items.forEach((entry) => {
        const body = entry.details?.['body'] as Record<string, unknown> | undefined;
        if (body) expect(body).not.toHaveProperty('password');
      });
    });
  });
});
