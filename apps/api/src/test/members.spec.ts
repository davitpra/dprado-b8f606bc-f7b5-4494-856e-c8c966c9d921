import * as request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { UserRole } from '@task-management/data';
import { createTestApp } from './helpers/app.helper';
import { seedTestData, getToken, SeedResult } from './helpers/seed.helper';

describe('Department Members API (integration)', () => {
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
  });

  afterAll(async () => {
    await app.close();
  });

  // ── GET /api/departments/:id/members — list ────────────────────────────────

  describe('GET /api/departments/:id/members — list', () => {
    it('Owner can list members of any department (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/departments/${seed.engineering.id}/members`)
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('Admin can list members of own department (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/departments/${seed.engineering.id}/members`)
        .set('Authorization', `Bearer ${tokens.adminEng}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('Viewer cannot list members (403)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/departments/${seed.engineering.id}/members`)
        .set('Authorization', `Bearer ${tokens.viewer1}`);
      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent department', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/departments/00000000-0000-0000-0000-000000000000/members')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(404);
    });

    it('returns 401 without token', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/departments/${seed.engineering.id}/members`,
      );
      expect(res.status).toBe(401);
    });
  });

  // ── POST /api/departments/:id/members — invite ─────────────────────────────

  describe('POST /api/departments/:id/members — invite', () => {
    it('Owner can invite user as Admin (201)', async () => {
      // Use viewer2 (who has no role in Engineering)
      const res = await request(app.getHttpServer())
        .post(`/api/departments/${seed.engineering.id}/members`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ userId: seed.viewer2.id, role: UserRole.ADMIN });
      expect(res.status).toBe(201);
      expect(res.body.role).toBe(UserRole.ADMIN);
    });

    it('Owner can invite user as Viewer (201)', async () => {
      // Create a fresh dept to avoid conflicts
      const deptRes = await request(app.getHttpServer())
        .post('/api/departments')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ name: 'Invite Test Dept' });
      const deptId = deptRes.body.id;

      const res = await request(app.getHttpServer())
        .post(`/api/departments/${deptId}/members`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ userId: seed.viewer2.id, role: UserRole.VIEWER });
      expect(res.status).toBe(201);
      expect(res.body.role).toBe(UserRole.VIEWER);
    });

    it('Admin can invite user as Viewer in own department (201)', async () => {
      // Create a fresh dept, make adminEng an admin there, then invite
      const deptRes = await request(app.getHttpServer())
        .post('/api/departments')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ name: 'Admin Invite Test Dept' });
      const deptId = deptRes.body.id;

      // Add adminEng as admin of this new dept
      await request(app.getHttpServer())
        .post(`/api/departments/${deptId}/members`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ userId: seed.adminEng.id, role: UserRole.ADMIN });

      // Now adminEng invites viewer1 as Viewer
      const res = await request(app.getHttpServer())
        .post(`/api/departments/${deptId}/members`)
        .set('Authorization', `Bearer ${tokens.adminEng}`)
        .send({ userId: seed.viewer1.id, role: UserRole.VIEWER });
      expect(res.status).toBe(201);
    });

    it('Admin cannot invite user as Admin (403)', async () => {
      // Create a fresh dept with adminEng as admin
      const deptRes = await request(app.getHttpServer())
        .post('/api/departments')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ name: 'Admin Cannot Invite Admin Dept' });
      const deptId = deptRes.body.id;
      await request(app.getHttpServer())
        .post(`/api/departments/${deptId}/members`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ userId: seed.adminEng.id, role: UserRole.ADMIN });

      // adminEng tries to invite as ADMIN — should fail
      const res = await request(app.getHttpServer())
        .post(`/api/departments/${deptId}/members`)
        .set('Authorization', `Bearer ${tokens.adminEng}`)
        .send({ userId: seed.viewer2.id, role: UserRole.ADMIN });
      expect(res.status).toBe(403);
    });

    it('Admin cannot invite into another department (403)', async () => {
      // adminEng tries to invite into Marketing (where they have no role)
      const res = await request(app.getHttpServer())
        .post(`/api/departments/${seed.marketing.id}/members`)
        .set('Authorization', `Bearer ${tokens.adminEng}`)
        .send({ userId: seed.viewer1.id, role: UserRole.VIEWER });
      expect(res.status).toBe(403);
    });

    it('Viewer cannot invite anyone (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/departments/${seed.engineering.id}/members`)
        .set('Authorization', `Bearer ${tokens.viewer1}`)
        .send({ userId: seed.viewer2.id, role: UserRole.VIEWER });
      expect(res.status).toBe(403);
    });

    it('returns 409 when user already has a role in the department', async () => {
      // viewer1 already has VIEWER role in Engineering
      const res = await request(app.getHttpServer())
        .post(`/api/departments/${seed.engineering.id}/members`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ userId: seed.viewer1.id, role: UserRole.VIEWER });
      expect(res.status).toBe(409);
    });

    it('returns 403 when trying to assign role to the org owner', async () => {
      // Cannot assign a dept role to the OWNER
      const res = await request(app.getHttpServer())
        .post(`/api/departments/${seed.engineering.id}/members`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ userId: seed.owner.id, role: UserRole.VIEWER });
      expect(res.status).toBe(403);
    });
  });

  // ── PUT /api/departments/:id/members/:userId — update role (Owner only) ────

  describe('PUT /api/departments/:id/members/:userId — update role', () => {
    it('Owner can update a member role (200)', async () => {
      // viewer1 is a VIEWER in Engineering — change to ADMIN
      const res = await request(app.getHttpServer())
        .put(
          `/api/departments/${seed.engineering.id}/members/${seed.viewer1.id}`,
        )
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ role: UserRole.ADMIN });
      expect(res.status).toBe(200);
      expect(res.body.role).toBe(UserRole.ADMIN);
    });

    it('Admin cannot update a member role (403)', async () => {
      const res = await request(app.getHttpServer())
        .put(
          `/api/departments/${seed.engineering.id}/members/${seed.viewer1.id}`,
        )
        .set('Authorization', `Bearer ${tokens.adminEng}`)
        .send({ role: UserRole.VIEWER });
      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent member', async () => {
      const res = await request(app.getHttpServer())
        .put(
          `/api/departments/${seed.engineering.id}/members/00000000-0000-0000-0000-000000000000`,
        )
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ role: UserRole.VIEWER });
      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /api/departments/:id/members/:userId — remove ──────────────────

  describe('DELETE /api/departments/:id/members/:userId — remove', () => {
    it('Owner can remove any member (204)', async () => {
      // Invite multi to a fresh dept, then remove them
      const deptRes = await request(app.getHttpServer())
        .post('/api/departments')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ name: 'Remove Test Dept' });
      const deptId = deptRes.body.id;
      await request(app.getHttpServer())
        .post(`/api/departments/${deptId}/members`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ userId: seed.multi.id, role: UserRole.VIEWER });

      const res = await request(app.getHttpServer())
        .delete(`/api/departments/${deptId}/members/${seed.multi.id}`)
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(204);
    });

    it('Admin can remove a Viewer from own department (204)', async () => {
      // Create dept, add adminEng as admin and viewer2 as viewer
      const deptRes = await request(app.getHttpServer())
        .post('/api/departments')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ name: 'Admin Remove Viewer Dept' });
      const deptId = deptRes.body.id;
      await request(app.getHttpServer())
        .post(`/api/departments/${deptId}/members`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ userId: seed.adminEng.id, role: UserRole.ADMIN });
      await request(app.getHttpServer())
        .post(`/api/departments/${deptId}/members`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ userId: seed.viewer2.id, role: UserRole.VIEWER });

      const res = await request(app.getHttpServer())
        .delete(`/api/departments/${deptId}/members/${seed.viewer2.id}`)
        .set('Authorization', `Bearer ${tokens.adminEng}`);
      expect(res.status).toBe(204);
    });

    it('Admin cannot remove an Admin from own department (403)', async () => {
      // Create dept with two admins
      const deptRes = await request(app.getHttpServer())
        .post('/api/departments')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ name: 'Admin Cannot Remove Admin Dept' });
      const deptId = deptRes.body.id;
      await request(app.getHttpServer())
        .post(`/api/departments/${deptId}/members`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ userId: seed.adminEng.id, role: UserRole.ADMIN });
      await request(app.getHttpServer())
        .post(`/api/departments/${deptId}/members`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ userId: seed.adminMkt.id, role: UserRole.ADMIN });

      // adminEng tries to remove adminMkt (also ADMIN) — should fail
      const res = await request(app.getHttpServer())
        .delete(`/api/departments/${deptId}/members/${seed.adminMkt.id}`)
        .set('Authorization', `Bearer ${tokens.adminEng}`);
      expect(res.status).toBe(403);
    });

    it('Viewer cannot remove anyone (403)', async () => {
      const res = await request(app.getHttpServer())
        .delete(
          `/api/departments/${seed.engineering.id}/members/${seed.adminEng.id}`,
        )
        .set('Authorization', `Bearer ${tokens.viewer1}`);
      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent member', async () => {
      const res = await request(app.getHttpServer())
        .delete(
          `/api/departments/${seed.engineering.id}/members/00000000-0000-0000-0000-000000000000`,
        )
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(404);
    });
  });
});
