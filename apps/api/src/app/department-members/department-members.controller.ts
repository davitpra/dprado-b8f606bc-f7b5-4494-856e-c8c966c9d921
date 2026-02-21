import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '@task-management/auth';
import { InviteMemberDto } from '@task-management/data';

import { User } from '../entities/user.entity';
import { DepartmentMembersService } from './department-members.service';

@Controller('departments/:departmentId/members')
export class DepartmentMembersController {
  constructor(private readonly membersService: DepartmentMembersService) {}

  /** POST /api/departments/:departmentId/members — invite a user to this department. */
  @Post()
  invite(
    @CurrentUser() user: User,
    @Param('departmentId') departmentId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.membersService.invite(user, departmentId, dto);
  }

  /** GET /api/departments/:departmentId/members — list department members. */
  @Get()
  findAll(
    @CurrentUser() user: User,
    @Param('departmentId') departmentId: string,
  ) {
    return this.membersService.findAll(user, departmentId);
  }

  /** DELETE /api/departments/:departmentId/members/:userId — remove a member. */
  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: User,
    @Param('departmentId') departmentId: string,
    @Param('userId') userId: string,
  ) {
    return this.membersService.remove(user, departmentId, userId);
  }
}
