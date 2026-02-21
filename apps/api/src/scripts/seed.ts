import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

import { Organization } from '../app/entities/organization.entity';
import { Department } from '../app/entities/department.entity';
import { User } from '../app/entities/user.entity';
import { UserRoleEntity } from '../app/entities/user-role.entity';
import { Task } from '../app/entities/task.entity';
import { Permission } from '../app/entities/permission.entity';
import { AuditLog } from '../app/entities/audit-log.entity';
import {
  TaskStatus,
  TaskCategory,
  TaskPriority,
  UserRole,
} from '@task-management/data';

const DB_ENTITIES = [
  Organization,
  Department,
  User,
  UserRoleEntity,
  Task,
  Permission,
  AuditLog,
];

async function seed() {
  const dbType = process.env['DATABASE_TYPE'] || 'better-sqlite3';
  const dbUrl = process.env['DATABASE_URL'] || './data/taskmanager.db';

  const dataSource = new DataSource(
    dbType === 'postgres'
      ? {
          type: 'postgres',
          url: dbUrl,
          entities: DB_ENTITIES,
          synchronize: true,
          logging: false,
        }
      : {
          type: 'better-sqlite3',
          database: dbUrl,
          entities: DB_ENTITIES,
          synchronize: true,
          logging: false,
        }
  );

  await dataSource.initialize();
  console.log('Database connected.');

  // ── Idempotency check ───────────────────────────────────────────────────────
  const orgRepo = dataSource.getRepository(Organization);
  const existing = await orgRepo.findOne({ where: { name: 'Acme Corp' } });
  if (existing) {
    console.log('Seed data already exists (Acme Corp found). Skipping.');
    await dataSource.destroy();
    return;
  }

  // ── Organization ────────────────────────────────────────────────────────────
  const org = await orgRepo.save(
    orgRepo.create({ name: 'Acme Corp', description: 'Demo organization' })
  );
  console.log(`Created organization: ${org.name}`);

  // ── Departments ─────────────────────────────────────────────────────────────
  const deptRepo = dataSource.getRepository(Department);
  const engineering = await deptRepo.save(
    deptRepo.create({
      name: 'Engineering',
      organizationId: org.id,
    })
  );
  const marketing = await deptRepo.save(
    deptRepo.create({
      name: 'Marketing',
      organizationId: org.id,
    })
  );
  console.log(`Created departments: Engineering, Marketing`);

  // ── Users ───────────────────────────────────────────────────────────────────
  const userRepo = dataSource.getRepository(User);

  const owner = await userRepo.save(
    userRepo.create({
      email: 'owner@acme.com',
      password: 'Password123!',
      firstName: 'Alice',
      lastName: 'Owner',
      organizationId: org.id,
    })
  );

  const adminEng = await userRepo.save(
    userRepo.create({
      email: 'admin.eng@acme.com',
      password: 'Password123!',
      firstName: 'Bob',
      lastName: 'Engineer',
      organizationId: org.id,
    })
  );

  const adminMkt = await userRepo.save(
    userRepo.create({
      email: 'admin.mkt@acme.com',
      password: 'Password123!',
      firstName: 'Carol',
      lastName: 'Marketer',
      organizationId: org.id,
    })
  );

  const viewer1 = await userRepo.save(
    userRepo.create({
      email: 'viewer1@acme.com',
      password: 'Password123!',
      firstName: 'Dave',
      lastName: 'Viewer',
      organizationId: org.id,
    })
  );

  const viewer2 = await userRepo.save(
    userRepo.create({
      email: 'viewer2@acme.com',
      password: 'Password123!',
      firstName: 'Eve',
      lastName: 'Viewer',
      organizationId: org.id,
    })
  );

  const multi = await userRepo.save(
    userRepo.create({
      email: 'multi@acme.com',
      password: 'Password123!',
      firstName: 'Frank',
      lastName: 'Multi',
      organizationId: org.id,
    })
  );

  console.log('Created 6 users');

  // ── User Roles (OWNER = org-wide with departmentId=null, others = dept-scoped) ─
  const roleRepo = dataSource.getRepository(UserRoleEntity);
  await roleRepo.save([
    roleRepo.create({
      userId: owner.id,
      role: UserRole.OWNER,
      departmentId: null,
    }),
    roleRepo.create({
      userId: adminEng.id,
      role: UserRole.ADMIN,
      departmentId: engineering.id,
    }),
    roleRepo.create({
      userId: adminMkt.id,
      role: UserRole.ADMIN,
      departmentId: marketing.id,
    }),
    roleRepo.create({
      userId: viewer1.id,
      role: UserRole.VIEWER,
      departmentId: engineering.id,
    }),
    roleRepo.create({
      userId: viewer2.id,
      role: UserRole.VIEWER,
      departmentId: marketing.id,
    }),
    roleRepo.create({
      userId: multi.id,
      role: UserRole.ADMIN,
      departmentId: engineering.id,
    }),
    roleRepo.create({
      userId: multi.id,
      role: UserRole.VIEWER,
      departmentId: marketing.id,
    }),
  ]);
  console.log('Assigned user roles');

  // ── Permissions ─────────────────────────────────────────────────────────────
  const permRepo = dataSource.getRepository(Permission);
  await permRepo.save([
    // ADMIN permissions
    permRepo.create({ action: 'create', resource: 'task', role: UserRole.ADMIN }),
    permRepo.create({ action: 'read', resource: 'task', role: UserRole.ADMIN }),
    permRepo.create({ action: 'update', resource: 'task', role: UserRole.ADMIN }),
    permRepo.create({ action: 'delete', resource: 'task', role: UserRole.ADMIN }),
    permRepo.create({ action: 'read', resource: 'department', role: UserRole.ADMIN }),
    permRepo.create({ action: 'invite', resource: 'user', role: UserRole.ADMIN }),
    // VIEWER permissions
    permRepo.create({ action: 'read', resource: 'task', role: UserRole.VIEWER }),
  ]);
  console.log('Created permission matrix (7 entries)');

  // ── Tasks (12 tasks across departments, statuses, categories, priorities) ──
  const taskRepo = dataSource.getRepository(Task);
  await taskRepo.save([
    // Engineering — TODO
    taskRepo.create({
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      departmentId: engineering.id,
      createdById: adminEng.id,
      assignedToId: adminEng.id,
    }),
    taskRepo.create({
      title: 'Write unit tests for auth module',
      description: 'Achieve 80% code coverage on the authentication module',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      position: 1,
      departmentId: engineering.id,
      createdById: adminEng.id,
      assignedToId: multi.id,
    }),
    // Engineering — IN_PROGRESS
    taskRepo.create({
      title: 'Implement drag-and-drop reorder',
      description: 'Add Angular CDK drag-drop to the kanban board',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      departmentId: engineering.id,
      createdById: owner.id,
      assignedToId: adminEng.id,
    }),
    taskRepo.create({
      title: 'Fix login redirect bug',
      description: 'Users are not redirected to dashboard after login',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      position: 1,
      departmentId: engineering.id,
      createdById: adminEng.id,
      assignedToId: viewer1.id,
    }),
    // Engineering — DONE
    taskRepo.create({
      title: 'Database schema design',
      description: 'Design and implement the initial TypeORM entity schema',
      status: TaskStatus.DONE,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      departmentId: engineering.id,
      createdById: owner.id,
      assignedToId: adminEng.id,
    }),
    taskRepo.create({
      title: 'Set up project monorepo',
      description: 'Initialize Nx workspace with NestJS and Angular',
      status: TaskStatus.DONE,
      category: TaskCategory.WORK,
      priority: TaskPriority.LOW,
      position: 1,
      departmentId: engineering.id,
      createdById: owner.id,
    }),
    // Marketing — TODO
    taskRepo.create({
      title: 'Design landing page mockup',
      description: 'Create Figma mockups for the new product landing page',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      departmentId: marketing.id,
      createdById: adminMkt.id,
      assignedToId: adminMkt.id,
    }),
    taskRepo.create({
      title: 'Plan Q1 social media calendar',
      description: 'Schedule posts for all social media platforms',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.LOW,
      position: 1,
      departmentId: marketing.id,
      createdById: adminMkt.id,
      assignedToId: viewer2.id,
    }),
    // Marketing — IN_PROGRESS
    taskRepo.create({
      title: 'Write blog post on product launch',
      description: 'Draft a 1500-word blog post for the upcoming release',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      position: 0,
      departmentId: marketing.id,
      createdById: adminMkt.id,
      assignedToId: adminMkt.id,
    }),
    taskRepo.create({
      title: 'Update brand guidelines',
      description: 'Refresh color palette and typography for 2026',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.PERSONAL,
      priority: TaskPriority.LOW,
      position: 1,
      departmentId: marketing.id,
      createdById: owner.id,
      assignedToId: viewer2.id,
    }),
    // Marketing — DONE
    taskRepo.create({
      title: 'Competitor analysis report',
      description: 'Research and document top 5 competitor strategies',
      status: TaskStatus.DONE,
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      position: 0,
      departmentId: marketing.id,
      createdById: adminMkt.id,
      assignedToId: adminMkt.id,
    }),
    taskRepo.create({
      title: 'Set up email newsletter template',
      description: 'Create reusable Mailchimp template for weekly digest',
      status: TaskStatus.DONE,
      category: TaskCategory.WORK,
      priority: TaskPriority.LOW,
      position: 1,
      departmentId: marketing.id,
      createdById: owner.id,
      assignedToId: multi.id,
    }),
  ]);
  console.log('Created 12 tasks');

  await dataSource.destroy();
  console.log('\nSeed completed successfully!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
