import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { Organization } from '../entities/organization.entity';
import { Department } from '../entities/department.entity';
import { User } from '../entities/user.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { Task } from '../entities/task.entity';
import { Permission } from '../entities/permission.entity';
import { AuditLog } from '../entities/audit-log.entity';

export const DB_ENTITIES = [
  Organization,
  Department,
  User,
  UserRoleEntity,
  Task,
  Permission,
  AuditLog,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const dbType = config.get<string>('DATABASE_TYPE', 'better-sqlite3');
        const dbUrl = config.get<string>('DATABASE_URL', './data/taskmanager.db');
        const isProduction = config.get<string>('NODE_ENV') === 'production';

        const base = {
          entities: DB_ENTITIES,
          synchronize: !isProduction, // auto-creates tables in dev; use migrations in prod
          logging: false,
        };

        if (dbType === 'postgres') {
          return {
            ...base,
            type: 'postgres',
            url: dbUrl,
            ssl: isProduction ? { rejectUnauthorized: true } : false,
          };
        }

        // Default: better-sqlite3 (dev)
        return {
          ...base,
          type: 'better-sqlite3',
          database: dbUrl,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
