import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@task-management/auth';

import { User } from '../entities/user.entity';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  /** GET /api/organizations/me — returns the current user's organization with departments. */
  @Get('me')
  @ApiOperation({ summary: 'Get the current user\'s organization' })
  @ApiResponse({ status: 200, description: 'Organization returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyOrganization(@CurrentUser() user: User) {
    return this.orgsService.getByUser(user.organizationId);
  }
}
