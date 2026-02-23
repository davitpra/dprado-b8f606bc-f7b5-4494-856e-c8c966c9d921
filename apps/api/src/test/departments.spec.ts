import * as request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { createTestApp } from './helpers/app.helper';
import { seedTestData, getToken, SeedResult } from './helpers/seed.helper';

describe('Departments API (integration)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let seed: SeedResult;
  let tokens: {
    owner: string;
    adminEng: string;
    viewer1: string;
  };

  beforeAll(async () => {
    ({ app, moduleRef } = await createTestApp());
    seed = await seedTestData(moduleRef);
    tokens = {
      owner: await getToken(app, 'owner@test.com'),
      adminEng: await getToken(app, 'admin.eng@test.com'),
      viewer1: await getToken(app, 'viewer1@test.com'),
    };
  });

  afterAll(async () => {
    await app.close();
  });

  // ── POST /api/departments — create ─────────────────────────────────────────

  describe('POST /api/departments — create (Owner only)', () => {
    it('Owner can create a department (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/departments')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ name: 'Legal' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Legal');
    });

    it('Admin cannot create a department (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/departments')
        .set('Authorization', `Bearer ${tokens.adminEng}`)
        .send({ name: 'Unauthorized Dept' });
      expect(res.status).toBe(403);
    });

    it('Viewer cannot create a department (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/departments')
        .set('Authorization', `Bearer ${tokens.viewer1}`)
        .send({ name: 'Unauthorized Dept' });
      expect(res.status).toBe(403);
    });

    it('returns 400 for missing name', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/departments')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('returns 401 without token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/departments')
        .send({ name: 'NoAuth' });
      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/departments — list (role-scoped) ──────────────────────────────

  describe('GET /api/departments — list', () => {
    it('Owner sees all departments in the organization (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/departments')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const names = (res.body as Array<{ name: string }>).map((d) => d.name);
      expect(names).toContain('Engineering');
      expect(names).toContain('Marketing');
    });

    it('Admin sees only assigned department(s) (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/departments')
        .set('Authorization', `Bearer ${tokens.adminEng}`);
      expect(res.status).toBe(200);
      const depts = res.body as Array<{ name: string }>;
      const names = depts.map((d) => d.name);
      expect(names).toContain('Engineering');
      expect(names).not.toContain('Marketing');
    });

    it('Viewer sees only assigned department(s) (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/departments')
        .set('Authorization', `Bearer ${tokens.viewer1}`);
      expect(res.status).toBe(200);
      const depts = res.body as Array<{ name: string }>;
      const names = depts.map((d) => d.name);
      expect(names).toContain('Engineering');
      expect(names).not.toContain('Marketing');
    });

    it('returns 401 without token', async () => {
      const res = await request(app.getHttpServer()).get('/api/departments');
      expect(res.status).toBe(401);
    });
  });

  // ── PUT /api/departments/:id — update (Owner only) ─────────────────────────

  describe('PUT /api/departments/:id — update (Owner only)', () => {
    it('Owner can update a department (200)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/departments/${seed.engineering.id}`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ name: 'Engineering Updated', description: 'Updated desc' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Engineering Updated');
    });

    it('Admin cannot update a department (403)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/departments/${seed.engineering.id}`)
        .set('Authorization', `Bearer ${tokens.adminEng}`)
        .send({ name: 'Should Fail' });
      expect(res.status).toBe(403);
    });

    it('Viewer cannot update a department (403)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/departments/${seed.engineering.id}`)
        .set('Authorization', `Bearer ${tokens.viewer1}`)
        .send({ name: 'Should Fail' });
      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent department', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/departments/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ name: 'Ghost' });
      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /api/departments/:id — delete (Owner only) ─────────────────────

  describe('DELETE /api/departments/:id — delete (Owner only)', () => {
    let tempDeptId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/departments')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ name: 'Temp Dept To Delete' });
      tempDeptId = res.body.id;
    });

    it('Admin cannot delete a department (403)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/departments/${tempDeptId}`)
        .set('Authorization', `Bearer ${tokens.adminEng}`);
      expect(res.status).toBe(403);
    });

    it('Viewer cannot delete a department (403)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/departments/${tempDeptId}`)
        .set('Authorization', `Bearer ${tokens.viewer1}`);
      expect(res.status).toBe(403);
    });

    it('Owner can delete a department (204)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/departments/${tempDeptId}`)
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(204);
    });

    it('returns 404 for non-existent department', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/departments/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(404);
    });
  });
});
