import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import {
  PERMISSION_KEY,
  RequiredPermission,
} from '../decorators/require-permission.decorator.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequirePermission() decorator → no restriction
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Owner bypasses all permission checks
    if (user.isOwner) {
      return true;
    }

    // Resolve departmentId from request (body, params, or query)
    const departmentId =
      request.body?.departmentId ||
      request.params?.departmentId ||
      request.params?.id ||
      request.query?.departmentId;

    const userRoles: { role: string; departmentId: string }[] =
      user.roles ?? [];

    // Get the user's roles scoped to the target department
    const applicableRoles = departmentId
      ? userRoles.filter((ur) => ur.departmentId === departmentId).map((ur) => ur.role)
      : userRoles.map((ur) => ur.role);

    if (!applicableRoles.length) {
      throw new ForbiddenException('No role in this department');
    }

    // Query the permissions table for a matching action + resource + role
    const count = await this.dataSource
      .createQueryBuilder()
      .select('p.id')
      .from('permissions', 'p')
      .where('p.action = :action', { action: required.action })
      .andWhere('p.resource = :resource', { resource: required.resource })
      .andWhere('p.role IN (:...roles)', { roles: applicableRoles })
      .getCount();

    if (count === 0) {
      throw new ForbiddenException(
        `Permission denied: ${required.action} on ${required.resource}`,
      );
    }

    return true;
  }
}
