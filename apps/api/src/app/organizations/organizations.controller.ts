import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@task-management/auth';
import { CreateOrgUserDto } from '@task-management/data/dto';

import { User } from '../entities/user.entity';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  /** POST /api/organizations/me/users — creates a new user in the owner's organization. */
  @Post('me/users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user in the current owner\'s organization' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 403, description: 'Only the organization owner can create users' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  createOrgUser(@CurrentUser() owner: User, @Body() dto: CreateOrgUserDto) {
    return this.orgsService.createUser(owner, dto);
  }

  /** GET /api/organizations/me/users — returns all users in the current user's organization. */
  @Get('me/users')
  @ApiOperation({ summary: 'List all users in the current user\'s organization' })
  @ApiResponse({ status: 200, description: 'Users returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyOrganizationUsers(@CurrentUser() user: User) {
    return this.orgsService.getUsersForOrg(user.organizationId);
  }

  /** GET /api/organizations/me — returns the current user's organization with departments. */
  @Get('me')
  @ApiOperation({ summary: 'Get the current user\'s organization' })
  @ApiResponse({ status: 200, description: 'Organization returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyOrganization(@CurrentUser() user: User) {
    return this.orgsService.getByUser(user.organizationId);
  }
}
