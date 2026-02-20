import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@task-management/data';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator → no restriction
    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Owner bypasses all role checks
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

    // Check if user holds any of the required roles for the target department
    const hasRole = userRoles.some(
      (ur) =>
        requiredRoles.includes(ur.role as UserRole) &&
        (!departmentId || ur.departmentId === departmentId),
    );

    if (!hasRole) {
      throw new ForbiddenException('Insufficient role for this department');
    }

    return true;
  }
}
