/**
 * TypeORM CLI DataSource — used only for generating and running migrations.
 *
 * Usage:
 *   npx typeorm-ts-node-commonjs migration:generate apps/api/src/migrations/InitialSchema -d apps/api/src/data-source.ts
 *   npx typeorm-ts-node-commonjs migration:run -d apps/api/src/data-source.ts
 *
 * This file is NOT imported by the application at runtime. The app uses
 * database.module.ts which configures TypeORM via ConfigService.
 */
import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

import { Organization } from './app/entities/organization.entity';
import { Department } from './app/entities/department.entity';
import { User } from './app/entities/user.entity';
import { UserRoleEntity } from './app/entities/user-role.entity';
import { Task } from './app/entities/task.entity';
import { Permission } from './app/entities/permission.entity';
import { AuditLog } from './app/entities/audit-log.entity';

const dbType = process.env['DATABASE_TYPE'] || 'better-sqlite3';
const dbUrl = process.env['DATABASE_URL'] || './data/taskmanager.db';

const DB_ENTITIES = [
  Organization,
  Department,
  User,
  UserRoleEntity,
  Task,
  Permission,
  AuditLog,
];

export default dbType === 'postgres'
  ? new DataSource({
      type: 'postgres',
      url: dbUrl,
      entities: DB_ENTITIES,
      migrations: ['apps/api/src/migrations/*.ts'],
      synchronize: false,
      ssl: { rejectUnauthorized: true },
    })
  : new DataSource({
      type: 'better-sqlite3',
      database: dbUrl,
      entities: DB_ENTITIES,
      migrations: ['apps/api/src/migrations/*.ts'],
      synchronize: false,
    });
