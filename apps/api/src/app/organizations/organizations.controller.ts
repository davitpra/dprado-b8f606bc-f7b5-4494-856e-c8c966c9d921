import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@task-management/auth';

import { User } from '../entities/user.entity';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  /** GET /api/organizations/me — returns the current user's organization with departments. */
  @Get('me')
  getMyOrganization(@CurrentUser() user: User) {
    return this.orgsService.getByUser(user.organizationId);
  }
}
