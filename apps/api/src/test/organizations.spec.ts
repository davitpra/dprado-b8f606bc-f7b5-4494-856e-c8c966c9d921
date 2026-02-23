import * as request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { createTestApp } from './helpers/app.helper';
import { seedTestData, getToken, SeedResult } from './helpers/seed.helper';

describe('Organizations API (integration)', () => {
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

  // ── GET /api/organizations/me ────────────────────────────────────────────────

  describe('GET /api/organizations/me', () => {
    it('Owner can get their organization (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/organizations/me')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Test Corp');
      expect(Array.isArray(res.body.departments)).toBe(true);
    });

    it('Admin can get their organization (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/organizations/me')
        .set('Authorization', `Bearer ${tokens.adminEng}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test Corp');
    });

    it('Viewer can get their organization (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/organizations/me')
        .set('Authorization', `Bearer ${tokens.viewer1}`);
      expect(res.status).toBe(200);
    });

    it('returns 401 without token', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/organizations/me',
      );
      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/organizations/me/users ──────────────────────────────────────────

  describe('GET /api/organizations/me/users', () => {
    it('Owner can list all users in the organization (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/organizations/me/users')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      // Password should not be exposed
      const users = res.body as Array<Record<string, unknown>>;
      users.forEach((u) => expect(u).not.toHaveProperty('password'));
    });

    it('Admin can list users in the organization (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/organizations/me/users')
        .set('Authorization', `Bearer ${tokens.adminEng}`);
      expect(res.status).toBe(200);
    });

    it('returns 401 without token', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/organizations/me/users',
      );
      expect(res.status).toBe(401);
    });
  });

  // ── POST /api/organizations/me/users ─────────────────────────────────────────

  describe('POST /api/organizations/me/users — create org user (Owner only)', () => {
    it('Owner can create a user in the organization (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/organizations/me/users')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({
          email: 'orguser@test.com',
          password: 'Password123!',
          firstName: 'Org',
          lastName: 'User',
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe('orguser@test.com');
      expect(res.body).not.toHaveProperty('password');
    });

    it('Admin cannot create a user in the organization (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/organizations/me/users')
        .set('Authorization', `Bearer ${tokens.adminEng}`)
        .send({
          email: 'adminorguser@test.com',
          password: 'Password123!',
          firstName: 'Admin',
          lastName: 'OrgUser',
        });
      expect(res.status).toBe(403);
    });

    it('returns 409 for duplicate email', async () => {
      // Already created 'orguser@test.com' above
      const res = await request(app.getHttpServer())
        .post('/api/organizations/me/users')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({
          email: 'orguser@test.com',
          password: 'Password123!',
          firstName: 'Dup',
          lastName: 'User',
        });
      expect(res.status).toBe(409);
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/organizations/me/users')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ email: 'incomplete@test.com' });
      expect(res.status).toBe(400);
    });
  });
});
