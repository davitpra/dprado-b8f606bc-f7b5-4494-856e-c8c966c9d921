import * as request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { createTestApp } from './helpers/app.helper';
import { seedTestData } from './helpers/seed.helper';

describe('Auth API (integration)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  // Obtained once to avoid hitting the login throttle limit (5/60s).
  // The login describe runs 4 more requests (2 fail-login + 1 bad-pass + 1 empty),
  // putting us exactly at the 5-request limit with no extras needed per describe.
  let ownerToken: string;
  let ownerRefreshToken: string;

  beforeAll(async () => {
    ({ app, moduleRef } = await createTestApp());
    await seedTestData(moduleRef);
    // Login #1 — reused across describe blocks to stay within throttle limit
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'owner@test.com', password: 'Password123!' });
    ownerToken = res.body.access_token;
    ownerRefreshToken = res.body.refresh_token;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── POST /api/auth/register ─────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should register a new user and return tokens (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'User',
          organizationName: 'New Corp',
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
      expect(typeof res.body.access_token).toBe('string');
    });

    it('should return 409 for duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'dup@test.com',
          password: 'Password123!',
          firstName: 'Dup',
          lastName: 'User',
        });
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'dup@test.com',
          password: 'Password123!',
          firstName: 'Dup',
          lastName: 'User',
        });
      expect(res.status).toBe(409);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'incomplete@test.com' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'Password123!',
          firstName: 'Bad',
          lastName: 'Email',
        });
      expect(res.status).toBe(400);
    });

    it('should return 400 for weak password (no uppercase)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'weakpass@test.com',
          password: 'password123',
          firstName: 'Weak',
          lastName: 'Pass',
        });
      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/auth/login ────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('should return tokens with valid credentials (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'owner@test.com', password: 'Password123!' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
    });

    it('should return 401 with wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'owner@test.com', password: 'WrongPassword!' });
      expect(res.status).toBe(401);
    });

    it('should return 401 with unknown email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'Password123!' });
      expect(res.status).toBe(401);
    });

    it('should return 400 for missing credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/auth/refresh ──────────────────────────────────────────────────

  // Uses ownerRefreshToken from outer beforeAll — no extra login needed
  describe('POST /api/auth/refresh', () => {
    const refreshToken = () => ownerRefreshToken;
    const accessToken = () => ownerToken;

    it('should return new tokens with valid refresh token (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refresh_token: refreshToken() });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
    });

    it('should return 401 with an invalid token string', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refresh_token: 'this-is-not-a-jwt' });
      expect(res.status).toBe(401);
    });

    it('should return 401 when using an access token as refresh token', async () => {
      // Access tokens have type=undefined in payload (not 'refresh')
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refresh_token: accessToken() });
      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/auth/me ────────────────────────────────────────────────────────
  // Uses ownerToken from outer beforeAll to avoid exceeding the login throttle limit

  describe('GET /api/auth/me', () => {
    it('should return user profile with roles (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('owner@test.com');
      expect(res.body.user.isOwner).toBe(true);
      expect(Array.isArray(res.body.roles)).toBe(true);
      expect(res.body.roles.length).toBeGreaterThan(0);
    });

    it('should not expose the password field', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      const res = await request(app.getHttpServer()).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  // ── JWT guard — protected routes ────────────────────────────────────────────

  describe('JWT guard (protected routes)', () => {
    it('should return 401 for GET /api/tasks without token', async () => {
      const res = await request(app.getHttpServer()).get('/api/tasks');
      expect(res.status).toBe(401);
    });

    it('should return 401 with a malformed bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', 'Bearer not-a-valid-jwt');
      expect(res.status).toBe(401);
    });

    it('should return 401 with missing bearer prefix', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', 'invalid-token');
      expect(res.status).toBe(401);
    });
  });
});
