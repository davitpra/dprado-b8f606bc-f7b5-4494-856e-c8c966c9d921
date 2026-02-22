import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogFilterDto, PaginatedResponseDto } from '@task-management/data/dto';

import { AuditLog } from '../entities/audit-log.entity';
import { User } from '../entities/user.entity';
import { AccessControlService } from '../access-control/access-control.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly accessControl: AccessControlService,
  ) {}

  /**
   * Persist an audit log entry.
   * Wrapped in try/catch so audit failures never break the main request flow.
   */
  async log(params: {
    action: string;
    resource: string;
    resourceId: string;
    userId: string;
    ipAddress: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    try {
      const entry = this.auditLogRepo.create(params);
      await this.auditLogRepo.save(entry);
    } catch (error) {
      this.logger.error('Failed to persist audit log', error);
    }
  }

  /**
   * Query audit logs with RBAC scoping.
   * - Owner: all logs for the organization
   * - Admin: logs scoped to their departments
   * - Viewer: forbidden
   */
  async findAll(
    user: User,
    filters: AuditLogFilterDto,
  ): Promise<PaginatedResponseDto<AuditLog>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.auditLogRepo
      .createQueryBuilder('audit_log')
      .leftJoinAndSelect('audit_log.user', 'user')
      .orderBy('audit_log.timestamp', 'DESC');

    if (this.accessControl.isOwner(user)) {
      // Owner: all logs where the acting user belongs to the same org
      qb.where('user.organizationId = :orgId', {
        orgId: user.organizationId,
      });
    } else {
      // Check if user has any admin roles
      const departments = await this.accessControl.getUserAdminDepartments(user.id);
      if (departments.length === 0) {
        throw new ForbiddenException(
          'You do not have permission to view audit logs',
        );
      }

      // Admin: filter by departmentId in the JSON details column
      const deptConditions = departments.map((dept, i) => {
        const param = `deptId${i}`;
        qb.setParameter(param, `%"departmentId":"${dept.id}"%`);
        return `audit_log.details LIKE :${param}`;
      });

      qb.where(`(${deptConditions.join(' OR ')})`);
    }

    // Optional filters
    if (filters.dateFrom) {
      qb.andWhere('audit_log.timestamp >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }
    if (filters.dateTo) {
      qb.andWhere('audit_log.timestamp <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }
    if (filters.userId) {
      qb.andWhere('audit_log.userId = :userId', { userId: filters.userId });
    }
    if (filters.action) {
      qb.andWhere('audit_log.action = :action', { action: filters.action });
    }
    if (filters.resource) {
      qb.andWhere('audit_log.resource = :resource', {
        resource: filters.resource,
      });
    }
    if (filters.departmentId) {
      qb.andWhere('audit_log.details LIKE :deptFilter', {
        deptFilter: `%"departmentId":"${filters.departmentId}"%`,
      });
    }

    // Pagination
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return new PaginatedResponseDto(items, total, page, limit);
  }
}
