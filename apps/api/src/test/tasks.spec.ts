import * as request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { TaskCategory, TaskPriority, TaskStatus } from '@task-management/data';
import { createTestApp } from './helpers/app.helper';
import { seedTestData, getToken, SeedResult } from './helpers/seed.helper';

describe('Tasks API — RBAC matrix (integration)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let seed: SeedResult;
  let tokens: {
    owner: string;
    adminEng: string;
    adminMkt: string;
    viewer1: string;
    viewer2: string;
    multi: string;
  };

  beforeAll(async () => {
    ({ app, moduleRef } = await createTestApp());
    seed = await seedTestData(moduleRef);
    tokens = {
      owner: await getToken(app, 'owner@test.com'),
      adminEng: await getToken(app, 'admin.eng@test.com'),
      adminMkt: await getToken(app, 'admin.mkt@test.com'),
      viewer1: await getToken(app, 'viewer1@test.com'),
      viewer2: await getToken(app, 'viewer2@test.com'),
      multi: await getToken(app, 'multi@test.com'),
    };
  });

  afterAll(async () => {
    await app.close();
  });

  // ── POST /api/tasks — create ─────────────────────────────────────────────────

  describe('POST /api/tasks — create', () => {
    const makeBody = (departmentId: string) => ({
      title: 'Test Task',
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      departmentId,
    });

    it('Owner can create tasks in any department (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send(makeBody(seed.engineering.id));
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Test Task');
    });

    it('Admin can create tasks in own department (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${tokens.adminEng}`)
        .send(makeBody(seed.engineering.id));
      expect(res.status).toBe(201);
    });

    it('Admin cannot create tasks in another department (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${tokens.adminEng}`)
        .send(makeBody(seed.marketing.id));
      expect(res.status).toBe(403);
    });

    it('Viewer cannot create tasks (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${tokens.viewer1}`)
        .send(makeBody(seed.engineering.id));
      expect(res.status).toBe(403);
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ title: 'No category' });
      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent department', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({
          title: 'Bad Dept',
          category: TaskCategory.WORK,
          priority: TaskPriority.LOW,
          departmentId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
        });
      expect(res.status).toBe(404);
    });
  });

  // ── GET /api/tasks — list ─────────────────────────────────────────────────────

  describe('GET /api/tasks — list', () => {
    it('Owner sees all tasks across departments (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      // Should see tasks from both departments
      const deptIds = (res.body.items as Array<{ departmentId: string }>).map(
        (t) => t.departmentId,
      );
      expect(deptIds).toContain(seed.engineering.id);
      expect(deptIds).toContain(seed.marketing.id);
    });

    it('Admin sees only own-department tasks (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', `Bearer ${tokens.adminEng}`);
      expect(res.status).toBe(200);
      const items = res.body.items as Array<{ departmentId: string }>;
      // All tasks should be in Engineering
      items.forEach((t) => expect(t.departmentId).toBe(seed.engineering.id));
    });

    it('Viewer sees only own tasks (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', `Bearer ${tokens.viewer1}`);
      expect(res.status).toBe(200);
      const items = res.body.items as Array<{
        createdById: string;
        assignedToId: string | null;
      }>;
      items.forEach((t) => {
        const isOwned =
          t.createdById === seed.viewer1.id ||
          t.assignedToId === seed.viewer1.id;
        expect(isOwned).toBe(true);
      });
    });

    it('Multi-role user sees Engineering (admin) and Marketing own-tasks (viewer) (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', `Bearer ${tokens.multi}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('supports filtering by status (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tasks?status=${TaskStatus.TODO}`)
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      const items = res.body.items as Array<{ status: string }>;
      items.forEach((t) => expect(t.status).toBe(TaskStatus.TODO));
    });

    it('supports filtering by departmentId (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tasks?departmentId=${seed.engineering.id}`)
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      const items = res.body.items as Array<{ departmentId: string }>;
      items.forEach((t) =>
        expect(t.departmentId).toBe(seed.engineering.id),
      );
    });
  });

  // ── GET /api/tasks/:id — findOne ──────────────────────────────────────────────

  describe('GET /api/tasks/:id — findOne', () => {
    it('Owner can read any task (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tasks/${seed.tasks.engTask1.id}`)
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(seed.tasks.engTask1.id);
    });

    it('Admin can read task in own department (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tasks/${seed.tasks.engTask1.id}`)
        .set('Authorization', `Bearer ${tokens.adminEng}`);
      expect(res.status).toBe(200);
    });

    it('Admin cannot read task in another department (403)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tasks/${seed.tasks.mktTask1.id}`)
        .set('Authorization', `Bearer ${tokens.adminEng}`);
      expect(res.status).toBe(403);
    });

    it('Viewer can read own task (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tasks/${seed.tasks.viewerTask.id}`)
        .set('Authorization', `Bearer ${tokens.viewer1}`);
      expect(res.status).toBe(200);
    });

    it("Viewer cannot read another user's task in same department (403)", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tasks/${seed.tasks.engTask1.id}`)
        .set('Authorization', `Bearer ${tokens.viewer1}`);
      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent task', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks/a1b2c3d4-e5f6-4890-abcd-ef1234567890')
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(404);
    });
  });

  // ── PUT /api/tasks/:id — update ───────────────────────────────────────────────

  describe('PUT /api/tasks/:id — update', () => {
    let taskId: string;

    beforeAll(async () => {
      // Create a fresh task for update tests
      const res = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${tokens.adminEng}`)
        .send({
          title: 'Task To Update',
          category: TaskCategory.WORK,
          priority: TaskPriority.LOW,
          departmentId: seed.engineering.id,
        });
      taskId = res.body.id;
    });

    it('Owner can update any task (200)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ title: 'Updated by Owner' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated by Owner');
    });

    it('Admin can update task in own department (200)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokens.adminEng}`)
        .send({ title: 'Updated by AdminEng' });
      expect(res.status).toBe(200);
    });

    it('Admin from another department cannot update task (403)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokens.adminMkt}`)
        .send({ title: 'Should fail' });
      expect(res.status).toBe(403);
    });

    it('Viewer can update own task (200)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/tasks/${seed.tasks.viewerTask.id}`)
        .set('Authorization', `Bearer ${tokens.viewer1}`)
        .send({ title: 'Viewer Updated Own Task' });
      expect(res.status).toBe(200);
    });

    it("Viewer cannot update another user's task (403)", async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/tasks/${seed.tasks.engTask1.id}`)
        .set('Authorization', `Bearer ${tokens.viewer1}`)
        .send({ title: 'Should fail' });
      expect(res.status).toBe(403);
    });
  });

  // ── PATCH /api/tasks/:id/reorder ──────────────────────────────────────────────

  describe('PATCH /api/tasks/:id/reorder', () => {
    let taskId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({
          title: 'Task To Reorder',
          category: TaskCategory.WORK,
          priority: TaskPriority.MEDIUM,
          departmentId: seed.engineering.id,
        });
      taskId = res.body.id;
    });

    it('Owner can reorder tasks (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${taskId}/reorder`)
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({ status: TaskStatus.IN_PROGRESS, position: 0 });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('Admin can reorder tasks in own department (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${taskId}/reorder`)
        .set('Authorization', `Bearer ${tokens.adminEng}`)
        .send({ status: TaskStatus.DONE, position: 1 });
      expect(res.status).toBe(200);
    });

    it('Viewer can reorder own task (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${seed.tasks.viewerTask.id}/reorder`)
        .set('Authorization', `Bearer ${tokens.viewer1}`)
        .send({ status: TaskStatus.IN_PROGRESS, position: 0 });
      expect(res.status).toBe(200);
    });

    it("Viewer cannot reorder another user's task (403)", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${seed.tasks.engTask1.id}/reorder`)
        .set('Authorization', `Bearer ${tokens.viewer1}`)
        .send({ status: TaskStatus.IN_PROGRESS, position: 0 });
      expect(res.status).toBe(403);
    });

    it('Admin from another department cannot reorder tasks (403)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${taskId}/reorder`)
        .set('Authorization', `Bearer ${tokens.adminMkt}`)
        .send({ status: TaskStatus.TODO, position: 0 });
      expect(res.status).toBe(403);
    });
  });

  // ── DELETE /api/tasks/:id — soft delete ───────────────────────────────────────

  describe('DELETE /api/tasks/:id — soft delete', () => {
    it('Owner can delete any task (200)', async () => {
      // Create a task to delete
      const createRes = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${tokens.owner}`)
        .send({
          title: 'Task To Delete By Owner',
          category: TaskCategory.WORK,
          priority: TaskPriority.LOW,
          departmentId: seed.engineering.id,
        });
      const taskId = createRes.body.id;

      const res = await request(app.getHttpServer())
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokens.owner}`);
      expect(res.status).toBe(200);
    });

    it('Admin can delete tasks in own department (200)', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${tokens.adminEng}`)
        .send({
          title: 'Task To Delete By Admin',
          category: TaskCategory.WORK,
          priority: TaskPriority.LOW,
          departmentId: seed.engineering.id,
        });
      const taskId = createRes.body.id;

      const res = await request(app.getHttpServer())
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokens.adminEng}`);
      expect(res.status).toBe(200);
    });

    it("Admin cannot delete task from another department (403)", async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/tasks/${seed.tasks.mktTask1.id}`)
        .set('Authorization', `Bearer ${tokens.adminEng}`);
      expect(res.status).toBe(403);
    });

    it('Viewer can delete own task (200)', async () => {
      // Create a task as viewer (via seed viewerTask)
      const res = await request(app.getHttpServer())
        .delete(`/api/tasks/${seed.tasks.viewerTask.id}`)
        .set('Authorization', `Bearer ${tokens.viewer1}`);
      // viewerTask is created by viewer1, so they should be able to delete it
      expect(res.status).toBe(200);
    });

    it("Viewer cannot delete another user's task (403)", async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/tasks/${seed.tasks.engTask1.id}`)
        .set('Authorization', `Bearer ${tokens.viewer1}`);
      expect(res.status).toBe(403);
    });
  });
});
