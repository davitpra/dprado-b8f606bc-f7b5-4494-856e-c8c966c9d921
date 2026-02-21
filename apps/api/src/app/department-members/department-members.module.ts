import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserRoleEntity } from '../entities/user-role.entity';
import { Department } from '../entities/department.entity';
import { User } from '../entities/user.entity';
import { AccessControlModule } from '../access-control/access-control.module';
import { DepartmentMembersController } from './department-members.controller';
import { DepartmentMembersService } from './department-members.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserRoleEntity, Department, User]),
    AccessControlModule,
  ],
  controllers: [DepartmentMembersController],
  providers: [DepartmentMembersService],
})
export class DepartmentMembersModule {}
