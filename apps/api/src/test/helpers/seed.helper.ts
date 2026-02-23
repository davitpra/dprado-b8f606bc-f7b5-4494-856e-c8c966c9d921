import * as request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { UserRole, TaskStatus, TaskCategory, TaskPriority } from '@task-management/data';
import { Organization } from '../../app/entities/organization.entity';
import { Department } from '../../app/entities/department.entity';
import { User } from '../../app/entities/user.entity';
import { UserRoleEntity } from '../../app/entities/user-role.entity';
import { Permission } from '../../app/entities/permission.entity';
import { Task } from '../../app/entities/task.entity';

export interface SeedResult {
  org: Organization;
  engineering: Department;
  marketing: Department;
  owner: User;
  adminEng: User;
  adminMkt: User;
  viewer1: User;
  viewer2: User;
  multi: User;
  tasks: {
    engTask1: Task;
    viewerTask: Task;
    mktTask1: Task;
  };
}

export async function seedTestData(moduleRef: TestingModule): Promise<SeedResult> {
  const orgRepo = moduleRef.get<Repository<Organization>>(
    getRepositoryToken(Organization),
  );
  const deptRepo = moduleRef.get<Repository<Department>>(
    getRepositoryToken(Department),
  );
  const userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
  const roleRepo = moduleRef.get<Repository<UserRoleEntity>>(
    getRepositoryToken(UserRoleEntity),
  );
  const permRepo = moduleRef.get<Repository<Permission>>(
    getRepositoryToken(Permission),
  );
  const taskRepo = moduleRef.get<Repository<Task>>(getRepositoryToken(Task));

  // Organization
  const org = await orgRepo.save(
    orgRepo.create({ name: 'Test Corp', description: 'Test organization' }),
  );

  // Departments
  const engineering = await deptRepo.save(
    deptRepo.create({ name: 'Engineering', organizationId: org.id }),
  );
  const marketing = await deptRepo.save(
    deptRepo.create({ name: 'Marketing', organizationId: org.id }),
  );

  // Users (passwords are hashed by @BeforeInsert hook on User entity)
  const owner = await userRepo.save(
    userRepo.create({
      email: 'owner@test.com',
      password: 'Password123!',
      firstName: 'Alice',
      lastName: 'Owner',
      organizationId: org.id,
    }),
  );
  const adminEng = await userRepo.save(
    userRepo.create({
      email: 'admin.eng@test.com',
      password: 'Password123!',
      firstName: 'Bob',
      lastName: 'Engineer',
      organizationId: org.id,
    }),
  );
  const adminMkt = await userRepo.save(
    userRepo.create({
      email: 'admin.mkt@test.com',
      password: 'Password123!',
      firstName: 'Carol',
      lastName: 'Marketer',
      organizationId: org.id,
    }),
  );
  const viewer1 = await userRepo.save(
    userRepo.create({
      email: 'viewer1@test.com',
      password: 'Password123!',
      firstName: 'Dave',
      lastName: 'Viewer',
      organizationId: org.id,
    }),
  );
  const viewer2 = await userRepo.save(
    userRepo.create({
      email: 'viewer2@test.com',
      password: 'Password123!',
      firstName: 'Eve',
      lastName: 'Viewer',
      organizationId: org.id,
    }),
  );
  const multi = await userRepo.save(
    userRepo.create({
      email: 'multi@test.com',
      password: 'Password123!',
      firstName: 'Frank',
      lastName: 'Multi',
      organizationId: org.id,
    }),
  );

  // User Roles (OWNER = org-wide with departmentId=null)
  await roleRepo.save([
    roleRepo.create({ userId: owner.id, role: UserRole.OWNER, departmentId: null }),
    roleRepo.create({ userId: adminEng.id, role: UserRole.ADMIN, departmentId: engineering.id }),
    roleRepo.create({ userId: adminMkt.id, role: UserRole.ADMIN, departmentId: marketing.id }),
    roleRepo.create({ userId: viewer1.id, role: UserRole.VIEWER, departmentId: engineering.id }),
    roleRepo.create({ userId: viewer2.id, role: UserRole.VIEWER, departmentId: marketing.id }),
    roleRepo.create({ userId: multi.id, role: UserRole.ADMIN, departmentId: engineering.id }),
    roleRepo.create({ userId: multi.id, role: UserRole.VIEWER, departmentId: marketing.id }),
  ]);

  // Permissions
  await permRepo.save([
    permRepo.create({ action: 'create', resource: 'task', role: UserRole.ADMIN }),
    permRepo.create({ action: 'read', resource: 'task', role: UserRole.ADMIN }),
    permRepo.create({ action: 'update', resource: 'task', role: UserRole.ADMIN }),
    permRepo.create({ action: 'delete', resource: 'task', role: UserRole.ADMIN }),
    permRepo.create({ action: 'read', resource: 'department', role: UserRole.ADMIN }),
    permRepo.create({ action: 'invite', resource: 'user', role: UserRole.ADMIN }),
    permRepo.create({ action: 'read', resource: 'task', role: UserRole.VIEWER }),
  ]);

  // Tasks
  const engTask1 = await taskRepo.save(
    taskRepo.create({
      title: 'Engineering Task 1',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      departmentId: engineering.id,
      createdById: adminEng.id,
    }),
  );
  const viewerTask = await taskRepo.save(
    taskRepo.create({
      title: 'Viewer Own Task',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      position: 1,
      departmentId: engineering.id,
      createdById: viewer1.id,
      assignedToId: viewer1.id,
    }),
  );
  const mktTask1 = await taskRepo.save(
    taskRepo.create({
      title: 'Marketing Task 1',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.LOW,
      position: 0,
      departmentId: marketing.id,
      createdById: adminMkt.id,
    }),
  );

  return {
    org,
    engineering,
    marketing,
    owner,
    adminEng,
    adminMkt,
    viewer1,
    viewer2,
    multi,
    tasks: { engTask1, viewerTask, mktTask1 },
  };
}

export async function getToken(
  app: INestApplication,
  email: string,
  password = 'Password123!',
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password });
  if (!res.body.access_token) {
    throw new Error(
      `Failed to get token for ${email}: ${JSON.stringify(res.body)}`,
    );
  }
  return res.body.access_token as string;
}
