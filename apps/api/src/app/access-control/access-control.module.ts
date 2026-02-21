import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserRoleEntity } from '../entities/user-role.entity';
import { Permission } from '../entities/permission.entity';
import { Task } from '../entities/task.entity';
import { AccessControlService } from './access-control.service';
import { PermissionsGuard } from './permissions.guard';
import { TaskOwnershipGuard } from './task-ownership.guard';

@Module({
  imports: [TypeOrmModule.forFeature([UserRoleEntity, Permission, Task])],
  providers: [AccessControlService, PermissionsGuard, TaskOwnershipGuard],
  exports: [AccessControlService, PermissionsGuard, TaskOwnershipGuard],
})
export class AccessControlModule {}
