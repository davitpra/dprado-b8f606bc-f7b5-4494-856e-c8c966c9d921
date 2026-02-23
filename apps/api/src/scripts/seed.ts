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
  const acmeExists = await orgRepo.findOne({ where: { name: 'Acme Corp' } });
  const globexExists = await orgRepo.findOne({ where: { name: 'Globex Corp' } });
  if (acmeExists && globexExists) {
    console.log('Seed data already exists (Acme Corp + Globex Corp found). Skipping.');
    await dataSource.destroy();
    return;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ORGANIZATION 1 — Acme Corp
  // ════════════════════════════════════════════════════════════════════════════
  const acme = await orgRepo.save(
    orgRepo.create({ name: 'Acme Corp', description: 'Global software company' })
  );
  console.log(`Created organization: ${acme.name}`);

  // ── Departments ─────────────────────────────────────────────────────────────
  const deptRepo = dataSource.getRepository(Department);
  const [engDept, mktDept, designDept] = await deptRepo.save([
    deptRepo.create({ name: 'Engineering', organizationId: acme.id }),
    deptRepo.create({ name: 'Marketing', organizationId: acme.id }),
    deptRepo.create({ name: 'Design', organizationId: acme.id }),
  ]);
  console.log('Created departments: Engineering, Marketing, Design (Acme Corp)');

  // ── Users ───────────────────────────────────────────────────────────────────
  const userRepo = dataSource.getRepository(User);

  const acmeOwner = await userRepo.save(
    userRepo.create({
      email: 'owner@acme.com',
      password: 'Password123!',
      firstName: 'Alice',
      lastName: 'Owner',
      organizationId: acme.id,
    })
  );

  const acmeAdminEng = await userRepo.save(
    userRepo.create({
      email: 'admin.eng@acme.com',
      password: 'Password123!',
      firstName: 'Bob',
      lastName: 'Engineer',
      organizationId: acme.id,
    })
  );

  const acmeAdminMkt = await userRepo.save(
    userRepo.create({
      email: 'admin.mkt@acme.com',
      password: 'Password123!',
      firstName: 'Carol',
      lastName: 'Marketer',
      organizationId: acme.id,
    })
  );

  const acmeAdminDesign = await userRepo.save(
    userRepo.create({
      email: 'admin.design@acme.com',
      password: 'Password123!',
      firstName: 'David',
      lastName: 'Designer',
      organizationId: acme.id,
    })
  );

  const acmeViewer1 = await userRepo.save(
    userRepo.create({
      email: 'viewer.eng@acme.com',
      password: 'Password123!',
      firstName: 'Eve',
      lastName: 'Viewer',
      organizationId: acme.id,
    })
  );

  const acmeViewer2 = await userRepo.save(
    userRepo.create({
      email: 'viewer.mkt@acme.com',
      password: 'Password123!',
      firstName: 'Frank',
      lastName: 'Viewer',
      organizationId: acme.id,
    })
  );

  // multi@acme.com — Admin in Engineering, Viewer in Marketing, Viewer in Design
  const acmeMulti = await userRepo.save(
    userRepo.create({
      email: 'multi@acme.com',
      password: 'Password123!',
      firstName: 'Grace',
      lastName: 'Multi',
      organizationId: acme.id,
    })
  );

  console.log('Created 7 users (Acme Corp)');

  // ── User Roles ───────────────────────────────────────────────────────────────
  const roleRepo = dataSource.getRepository(UserRoleEntity);
  await roleRepo.save([
    roleRepo.create({ userId: acmeOwner.id,     role: UserRole.OWNER,  departmentId: null }),
    roleRepo.create({ userId: acmeAdminEng.id,  role: UserRole.ADMIN,  departmentId: engDept.id }),
    roleRepo.create({ userId: acmeAdminMkt.id,  role: UserRole.ADMIN,  departmentId: mktDept.id }),
    roleRepo.create({ userId: acmeAdminDesign.id, role: UserRole.ADMIN, departmentId: designDept.id }),
    roleRepo.create({ userId: acmeViewer1.id,   role: UserRole.VIEWER, departmentId: engDept.id }),
    roleRepo.create({ userId: acmeViewer2.id,   role: UserRole.VIEWER, departmentId: mktDept.id }),
    roleRepo.create({ userId: acmeMulti.id,     role: UserRole.ADMIN,  departmentId: engDept.id }),
    roleRepo.create({ userId: acmeMulti.id,     role: UserRole.VIEWER, departmentId: mktDept.id }),
    roleRepo.create({ userId: acmeMulti.id,     role: UserRole.VIEWER, departmentId: designDept.id }),
  ]);
  console.log('Assigned user roles (Acme Corp)');

  // ── Tasks — Engineering ──────────────────────────────────────────────────────
  const taskRepo = dataSource.getRepository(Task);
  await taskRepo.save([
    // TODO
    taskRepo.create({
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      dueDate: '2026-03-07',
      departmentId: engDept.id,
      createdById: acmeAdminEng.id,
      assignedToId: acmeAdminEng.id,
    }),
    taskRepo.create({
      title: 'Write unit tests for auth module',
      description: 'Achieve 80% code coverage on the authentication module',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      position: 1,
      dueDate: '2026-03-20',
      departmentId: engDept.id,
      createdById: acmeAdminEng.id,
      assignedToId: acmeMulti.id,
    }),
    taskRepo.create({
      title: 'Upgrade dependencies to latest LTS',
      description: 'Run npm audit and update all packages to latest LTS versions',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.LOW,
      position: 2,
      dueDate: '2026-04-01',
      departmentId: engDept.id,
      createdById: acmeOwner.id,
      assignedToId: acmeViewer1.id,
    }),
    // IN_PROGRESS
    taskRepo.create({
      title: 'Implement drag-and-drop reorder',
      description: 'Add Angular CDK drag-drop to the kanban board',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      dueDate: '2026-02-28',
      departmentId: engDept.id,
      createdById: acmeOwner.id,
      assignedToId: acmeAdminEng.id,
    }),
    taskRepo.create({
      title: 'Fix login redirect bug',
      description: 'Users are not redirected to dashboard after login',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      position: 1,
      dueDate: '2026-02-24',
      departmentId: engDept.id,
      createdById: acmeAdminEng.id,
      assignedToId: acmeViewer1.id,
    }),
    // DONE
    taskRepo.create({
      title: 'Database schema design',
      description: 'Design and implement the initial TypeORM entity schema',
      status: TaskStatus.DONE,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      dueDate: '2026-02-10',
      departmentId: engDept.id,
      createdById: acmeOwner.id,
      assignedToId: acmeAdminEng.id,
    }),
    taskRepo.create({
      title: 'Set up project monorepo',
      description: 'Initialize Nx workspace with NestJS and Angular',
      status: TaskStatus.DONE,
      category: TaskCategory.WORK,
      priority: TaskPriority.LOW,
      position: 1,
      departmentId: engDept.id,
      createdById: acmeOwner.id,
    }),
  ]);

  // ── Tasks — Marketing ────────────────────────────────────────────────────────
  await taskRepo.save([
    // TODO
    taskRepo.create({
      title: 'Design landing page mockup',
      description: 'Create Figma mockups for the new product landing page',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      dueDate: '2026-03-14',
      departmentId: mktDept.id,
      createdById: acmeAdminMkt.id,
      assignedToId: acmeAdminMkt.id,
    }),
    taskRepo.create({
      title: 'Plan Q2 social media calendar',
      description: 'Schedule posts for all social media platforms',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.LOW,
      position: 1,
      dueDate: '2026-03-31',
      departmentId: mktDept.id,
      createdById: acmeAdminMkt.id,
      assignedToId: acmeViewer2.id,
    }),
    taskRepo.create({
      title: 'A/B test email subject lines',
      description: 'Set up A/B test for newsletter open rate optimization',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      position: 2,
      dueDate: '2026-04-10',
      departmentId: mktDept.id,
      createdById: acmeAdminMkt.id,
      assignedToId: acmeMulti.id,
    }),
    // IN_PROGRESS
    taskRepo.create({
      title: 'Write blog post on product launch',
      description: 'Draft a 1500-word blog post for the upcoming release',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      position: 0,
      dueDate: '2026-03-05',
      departmentId: mktDept.id,
      createdById: acmeAdminMkt.id,
      assignedToId: acmeAdminMkt.id,
    }),
    taskRepo.create({
      title: 'Update brand guidelines',
      description: 'Refresh color palette and typography for 2026',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.PERSONAL,
      priority: TaskPriority.LOW,
      position: 1,
      dueDate: '2026-03-25',
      departmentId: mktDept.id,
      createdById: acmeOwner.id,
      assignedToId: acmeViewer2.id,
    }),
    // DONE
    taskRepo.create({
      title: 'Competitor analysis report',
      description: 'Research and document top 5 competitor strategies',
      status: TaskStatus.DONE,
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      position: 0,
      dueDate: '2026-02-14',
      departmentId: mktDept.id,
      createdById: acmeAdminMkt.id,
      assignedToId: acmeAdminMkt.id,
    }),
    taskRepo.create({
      title: 'Set up email newsletter template',
      description: 'Create reusable Mailchimp template for weekly digest',
      status: TaskStatus.DONE,
      category: TaskCategory.WORK,
      priority: TaskPriority.LOW,
      position: 1,
      departmentId: mktDept.id,
      createdById: acmeOwner.id,
    }),
  ]);

  // ── Tasks — Design ───────────────────────────────────────────────────────────
  await taskRepo.save([
    // TODO
    taskRepo.create({
      title: 'Create design system tokens',
      description: 'Define color, spacing, and typography tokens in Figma',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      dueDate: '2026-03-10',
      departmentId: designDept.id,
      createdById: acmeAdminDesign.id,
      assignedToId: acmeAdminDesign.id,
    }),
    taskRepo.create({
      title: 'Redesign onboarding flow',
      description: 'Simplify the user onboarding from 6 steps to 3',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      position: 1,
      dueDate: '2026-03-28',
      departmentId: designDept.id,
      createdById: acmeOwner.id,
      assignedToId: acmeAdminDesign.id,
    }),
    // IN_PROGRESS
    taskRepo.create({
      title: 'Dark mode UI audit',
      description: 'Check all screens for contrast ratio compliance in dark mode',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      dueDate: '2026-02-26',
      departmentId: designDept.id,
      createdById: acmeAdminDesign.id,
      assignedToId: acmeAdminDesign.id,
    }),
    taskRepo.create({
      title: 'Icon library review',
      description: 'Audit and standardize icon usage across all product screens',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.WORK,
      priority: TaskPriority.LOW,
      position: 1,
      dueDate: '2026-03-15',
      departmentId: designDept.id,
      createdById: acmeAdminDesign.id,
      assignedToId: acmeMulti.id,
    }),
    // DONE
    taskRepo.create({
      title: 'Wireframes for v1.0 release',
      description: 'Lo-fi wireframes approved by stakeholders',
      status: TaskStatus.DONE,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      dueDate: '2026-01-30',
      departmentId: designDept.id,
      createdById: acmeOwner.id,
      assignedToId: acmeAdminDesign.id,
    }),
  ]);
  console.log('Created 19 tasks (Acme Corp)');

  // ════════════════════════════════════════════════════════════════════════════
  // ORGANIZATION 2 — Globex Corp
  // ════════════════════════════════════════════════════════════════════════════
  const globex = await orgRepo.save(
    orgRepo.create({ name: 'Globex Corp', description: 'Enterprise SaaS solutions' })
  );
  console.log(`Created organization: ${globex.name}`);

  // ── Departments ─────────────────────────────────────────────────────────────
  const [productDept, salesDept, supportDept] = await deptRepo.save([
    deptRepo.create({ name: 'Product', organizationId: globex.id }),
    deptRepo.create({ name: 'Sales', organizationId: globex.id }),
    deptRepo.create({ name: 'Support', organizationId: globex.id }),
  ]);
  console.log('Created departments: Product, Sales, Support (Globex Corp)');

  // ── Users ───────────────────────────────────────────────────────────────────
  const globexOwner = await userRepo.save(
    userRepo.create({
      email: 'owner@globex.com',
      password: 'Password123!',
      firstName: 'Henry',
      lastName: 'Owner',
      organizationId: globex.id,
    })
  );

  const globexAdminProduct = await userRepo.save(
    userRepo.create({
      email: 'admin.product@globex.com',
      password: 'Password123!',
      firstName: 'Iris',
      lastName: 'Product',
      organizationId: globex.id,
    })
  );

  const globexAdminSales = await userRepo.save(
    userRepo.create({
      email: 'admin.sales@globex.com',
      password: 'Password123!',
      firstName: 'Jack',
      lastName: 'Sales',
      organizationId: globex.id,
    })
  );

  const globexAdminSupport = await userRepo.save(
    userRepo.create({
      email: 'admin.support@globex.com',
      password: 'Password123!',
      firstName: 'Karen',
      lastName: 'Support',
      organizationId: globex.id,
    })
  );

  const globexViewer1 = await userRepo.save(
    userRepo.create({
      email: 'viewer.product@globex.com',
      password: 'Password123!',
      firstName: 'Leo',
      lastName: 'Viewer',
      organizationId: globex.id,
    })
  );

  const globexViewer2 = await userRepo.save(
    userRepo.create({
      email: 'viewer.sales@globex.com',
      password: 'Password123!',
      firstName: 'Mia',
      lastName: 'Viewer',
      organizationId: globex.id,
    })
  );

  // multi@globex.com — Admin in Sales, Viewer in Product, Viewer in Support
  const globexMulti = await userRepo.save(
    userRepo.create({
      email: 'multi@globex.com',
      password: 'Password123!',
      firstName: 'Noah',
      lastName: 'Multi',
      organizationId: globex.id,
    })
  );

  console.log('Created 7 users (Globex Corp)');

  // ── User Roles ───────────────────────────────────────────────────────────────
  await roleRepo.save([
    roleRepo.create({ userId: globexOwner.id,        role: UserRole.OWNER,  departmentId: null }),
    roleRepo.create({ userId: globexAdminProduct.id, role: UserRole.ADMIN,  departmentId: productDept.id }),
    roleRepo.create({ userId: globexAdminSales.id,   role: UserRole.ADMIN,  departmentId: salesDept.id }),
    roleRepo.create({ userId: globexAdminSupport.id, role: UserRole.ADMIN,  departmentId: supportDept.id }),
    roleRepo.create({ userId: globexViewer1.id,      role: UserRole.VIEWER, departmentId: productDept.id }),
    roleRepo.create({ userId: globexViewer2.id,      role: UserRole.VIEWER, departmentId: salesDept.id }),
    roleRepo.create({ userId: globexMulti.id,        role: UserRole.ADMIN,  departmentId: salesDept.id }),
    roleRepo.create({ userId: globexMulti.id,        role: UserRole.VIEWER, departmentId: productDept.id }),
    roleRepo.create({ userId: globexMulti.id,        role: UserRole.VIEWER, departmentId: supportDept.id }),
  ]);
  console.log('Assigned user roles (Globex Corp)');

  // ── Tasks — Product ──────────────────────────────────────────────────────────
  await taskRepo.save([
    // TODO
    taskRepo.create({
      title: 'Define Q3 product roadmap',
      description: 'Align roadmap with stakeholders and document in Notion',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      dueDate: '2026-03-15',
      departmentId: productDept.id,
      createdById: globexOwner.id,
      assignedToId: globexAdminProduct.id,
    }),
    taskRepo.create({
      title: 'User research interviews',
      description: 'Conduct 10 user interviews to validate new feature hypotheses',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      position: 1,
      dueDate: '2026-03-22',
      departmentId: productDept.id,
      createdById: globexAdminProduct.id,
      assignedToId: globexViewer1.id,
    }),
    taskRepo.create({
      title: 'Write PRD for notification center',
      description: 'Product requirements document covering all notification types',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.LOW,
      position: 2,
      dueDate: '2026-04-05',
      departmentId: productDept.id,
      createdById: globexAdminProduct.id,
      assignedToId: globexMulti.id,
    }),
    // IN_PROGRESS
    taskRepo.create({
      title: 'Prioritize backlog for sprint 12',
      description: 'Review and rank all backlog items with engineering team',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      dueDate: '2026-02-27',
      departmentId: productDept.id,
      createdById: globexAdminProduct.id,
      assignedToId: globexAdminProduct.id,
    }),
    taskRepo.create({
      title: 'Analyze churn metrics',
      description: 'Build dashboard showing monthly churn rate by plan tier',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      position: 1,
      dueDate: '2026-03-01',
      departmentId: productDept.id,
      createdById: globexAdminProduct.id,
      assignedToId: globexViewer1.id,
    }),
    // DONE
    taskRepo.create({
      title: 'Feature flag rollout for beta',
      description: 'Enable beta features for 10% of users via feature flags',
      status: TaskStatus.DONE,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      dueDate: '2026-02-12',
      departmentId: productDept.id,
      createdById: globexOwner.id,
      assignedToId: globexAdminProduct.id,
    }),
  ]);

  // ── Tasks — Sales ─────────────────────────────────────────────────────────────
  await taskRepo.save([
    // TODO
    taskRepo.create({
      title: 'Prepare Q2 sales forecast',
      description: 'Model next quarter revenue based on pipeline data',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      dueDate: '2026-03-10',
      departmentId: salesDept.id,
      createdById: globexAdminSales.id,
      assignedToId: globexAdminSales.id,
    }),
    taskRepo.create({
      title: 'Send proposals to enterprise leads',
      description: 'Personalize and send proposals to 8 enterprise prospects',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      position: 1,
      dueDate: '2026-03-18',
      departmentId: salesDept.id,
      createdById: globexAdminSales.id,
      assignedToId: globexViewer2.id,
    }),
    taskRepo.create({
      title: 'CRM data cleanup',
      description: 'Remove duplicate contacts and update deal stages in HubSpot',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.LOW,
      position: 2,
      dueDate: '2026-04-01',
      departmentId: salesDept.id,
      createdById: globexMulti.id,
      assignedToId: globexMulti.id,
    }),
    // IN_PROGRESS
    taskRepo.create({
      title: 'Negotiate renewal with Acme Ltd',
      description: 'Contract renewal negotiation for their enterprise plan',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      dueDate: '2026-02-25',
      departmentId: salesDept.id,
      createdById: globexOwner.id,
      assignedToId: globexAdminSales.id,
    }),
    taskRepo.create({
      title: 'Set up demo environment for prospects',
      description: 'Configure a dedicated sandbox environment for sales demos',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      position: 1,
      dueDate: '2026-03-03',
      departmentId: salesDept.id,
      createdById: globexAdminSales.id,
      assignedToId: globexMulti.id,
    }),
    // DONE
    taskRepo.create({
      title: 'Close deal with Beta Industries',
      description: 'Signed contract for 200-seat professional plan',
      status: TaskStatus.DONE,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      dueDate: '2026-02-15',
      departmentId: salesDept.id,
      createdById: globexAdminSales.id,
      assignedToId: globexAdminSales.id,
    }),
    taskRepo.create({
      title: 'Onboarding deck update',
      description: 'Refresh sales deck slides for 2026 pricing changes',
      status: TaskStatus.DONE,
      category: TaskCategory.WORK,
      priority: TaskPriority.LOW,
      position: 1,
      departmentId: salesDept.id,
      createdById: globexOwner.id,
    }),
  ]);

  // ── Tasks — Support ───────────────────────────────────────────────────────────
  await taskRepo.save([
    // TODO
    taskRepo.create({
      title: 'Write troubleshooting guide for SSO',
      description: 'Document common SSO integration errors and fixes',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      position: 0,
      dueDate: '2026-03-12',
      departmentId: supportDept.id,
      createdById: globexAdminSupport.id,
      assignedToId: globexAdminSupport.id,
    }),
    taskRepo.create({
      title: 'Review open tickets backlog',
      description: 'Triage all open tickets older than 7 days',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 1,
      dueDate: '2026-02-28',
      departmentId: supportDept.id,
      createdById: globexOwner.id,
      assignedToId: globexMulti.id,
    }),
    // IN_PROGRESS
    taskRepo.create({
      title: 'Migrate help center to new platform',
      description: 'Move all articles from Zendesk to Intercom',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      dueDate: '2026-03-07',
      departmentId: supportDept.id,
      createdById: globexAdminSupport.id,
      assignedToId: globexAdminSupport.id,
    }),
    taskRepo.create({
      title: 'Create chatbot FAQ responses',
      description: 'Write 30 Q&A pairs to train the support chatbot',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.WORK,
      priority: TaskPriority.MEDIUM,
      position: 1,
      dueDate: '2026-03-20',
      departmentId: supportDept.id,
      createdById: globexAdminSupport.id,
      assignedToId: globexMulti.id,
    }),
    // DONE
    taskRepo.create({
      title: 'Implement SLA tracking dashboard',
      description: 'Build Metabase dashboard for first-response SLA compliance',
      status: TaskStatus.DONE,
      category: TaskCategory.WORK,
      priority: TaskPriority.HIGH,
      position: 0,
      dueDate: '2026-02-10',
      departmentId: supportDept.id,
      createdById: globexOwner.id,
      assignedToId: globexAdminSupport.id,
    }),
  ]);
  console.log('Created 23 tasks (Globex Corp)');

  // ════════════════════════════════════════════════════════════════════════════
  // PERMISSIONS — global, shared across all orgs
  // ════════════════════════════════════════════════════════════════════════════
  const permRepo = dataSource.getRepository(Permission);
  await permRepo.save([
    // ADMIN permissions
    permRepo.create({ action: 'create', resource: 'task',       role: UserRole.ADMIN }),
    permRepo.create({ action: 'read',   resource: 'task',       role: UserRole.ADMIN }),
    permRepo.create({ action: 'update', resource: 'task',       role: UserRole.ADMIN }),
    permRepo.create({ action: 'delete', resource: 'task',       role: UserRole.ADMIN }),
    permRepo.create({ action: 'read',   resource: 'department', role: UserRole.ADMIN }),
    permRepo.create({ action: 'invite', resource: 'user',       role: UserRole.ADMIN }),
    // VIEWER permissions
    permRepo.create({ action: 'read',   resource: 'task',       role: UserRole.VIEWER }),
  ]);
  console.log('Created permission matrix (7 entries)');

  await dataSource.destroy();
  console.log('\nSeed completed successfully!');
  console.log('\n──────────────────────────────────────────────────────────────');
  console.log('ACME CORP credentials (org: Acme Corp)');
  console.log('──────────────────────────────────────────────────────────────');
  console.log('  owner@acme.com          Password123!  → Owner');
  console.log('  admin.eng@acme.com      Password123!  → Admin (Engineering)');
  console.log('  admin.mkt@acme.com      Password123!  → Admin (Marketing)');
  console.log('  admin.design@acme.com   Password123!  → Admin (Design)');
  console.log('  viewer.eng@acme.com     Password123!  → Viewer (Engineering)');
  console.log('  viewer.mkt@acme.com     Password123!  → Viewer (Marketing)');
  console.log('  multi@acme.com          Password123!  → Admin(Eng) + Viewer(Mkt) + Viewer(Design)');
  console.log('\nGLOBEX CORP credentials (org: Globex Corp)');
  console.log('──────────────────────────────────────────────────────────────');
  console.log('  owner@globex.com        Password123!  → Owner');
  console.log('  admin.product@globex.com Password123! → Admin (Product)');
  console.log('  admin.sales@globex.com  Password123!  → Admin (Sales)');
  console.log('  admin.support@globex.com Password123! → Admin (Support)');
  console.log('  viewer.product@globex.com Password123! → Viewer (Product)');
  console.log('  viewer.sales@globex.com Password123!  → Viewer (Sales)');
  console.log('  multi@globex.com        Password123!  → Admin(Sales) + Viewer(Product) + Viewer(Support)');
  console.log('──────────────────────────────────────────────────────────────\n');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
