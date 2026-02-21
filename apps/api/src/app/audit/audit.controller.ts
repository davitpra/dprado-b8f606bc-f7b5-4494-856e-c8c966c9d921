import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@task-management/auth';
import { AuditLogFilterDto } from '@task-management/data/dto';

import { User } from '../entities/user.entity';
import { AuditService } from './audit.service';

@ApiTags('Audit Log')
@ApiBearerAuth()
@Controller('audit-log')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /** GET /api/audit-log — query audit logs with RBAC scoping. */
  @Get()
  @ApiOperation({ summary: 'Query audit logs (Owner: all, Admin: own departments)' })
  @ApiResponse({ status: 200, description: 'Paginated list of audit log entries' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — Viewer cannot access audit logs' })
  findAll(@CurrentUser() user: User, @Query() filters: AuditLogFilterDto) {
    return this.auditService.findAll(user, filters);
  }
}
