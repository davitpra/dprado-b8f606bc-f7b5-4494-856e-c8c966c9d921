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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@task-management/auth';
import { InviteMemberDto } from '@task-management/data/dto';

import { User } from '../entities/user.entity';
import { DepartmentMembersService } from './department-members.service';

@ApiTags('Department Members')
@ApiBearerAuth()
@Controller('departments/:departmentId/members')
export class DepartmentMembersController {
  constructor(private readonly membersService: DepartmentMembersService) {}

  /** POST /api/departments/:departmentId/members — invite a user to this department. */
  @Post()
  @ApiOperation({ summary: 'Invite a user to a department' })
  @ApiParam({ name: 'departmentId', description: 'Department UUID' })
  @ApiResponse({ status: 201, description: 'Member invited successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Department or user not found' })
  invite(
    @CurrentUser() user: User,
    @Param('departmentId') departmentId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.membersService.invite(user, departmentId, dto);
  }

  /** GET /api/departments/:departmentId/members — list department members. */
  @Get()
  @ApiOperation({ summary: 'List members of a department' })
  @ApiParam({ name: 'departmentId', description: 'Department UUID' })
  @ApiResponse({ status: 200, description: 'Members returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  findAll(
    @CurrentUser() user: User,
    @Param('departmentId') departmentId: string,
  ) {
    return this.membersService.findAll(user, departmentId);
  }

  /** DELETE /api/departments/:departmentId/members/:userId — remove a member. */
  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from a department' })
  @ApiParam({ name: 'departmentId', description: 'Department UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID to remove' })
  @ApiResponse({ status: 204, description: 'Member removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Department or member not found' })
  remove(
    @CurrentUser() user: User,
    @Param('departmentId') departmentId: string,
    @Param('userId') userId: string,
  ) {
    return this.membersService.remove(user, departmentId, userId);
  }
}
