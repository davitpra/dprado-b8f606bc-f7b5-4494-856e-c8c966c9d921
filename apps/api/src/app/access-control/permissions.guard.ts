import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PERMISSION_KEY,
  RequiredPermission,
} from '@task-management/auth';

import { Task } from '../entities/task.entity';
import { AccessControlService } from './access-control.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly acl: AccessControlService,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequirePermission() decorator → allow through
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Owner bypasses all permission checks
    if (this.acl.isOwner(user)) {
      return true;
    }

    // Resolve departmentId: explicit sources first, then task lookup
    const departmentId = await this.resolveDepartmentId(request);

    if (!departmentId) {
      throw new ForbiddenException(
        'Unable to determine department context for permission check',
      );
    }

    const allowed = await this.acl.hasPermission(
      user,
      departmentId,
      required.action,
      required.resource,
    );

    if (!allowed) {
      throw new ForbiddenException(
        `Permission denied: ${required.action} on ${required.resource}`,
      );
    }

    return true;
  }

  /**
   * Resolve departmentId from the request in priority order:
   * 1. body.departmentId  — POST/PUT payloads
   * 2. params.departmentId — /departments/:departmentId/...
   * 3. query.departmentId  — GET with query filter
   * 4. Task lookup         — /tasks/:id routes → load task → task.departmentId
   *    (also attaches the loaded task to request for downstream reuse)
   */
  private async resolveDepartmentId(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request: Record<string, any>,
  ): Promise<string | null> {
    const explicit =
      request.body?.departmentId ||
      request.params?.departmentId ||
      request.query?.departmentId;

    if (explicit) return explicit;

    // Fallback: try to load a Task from params.id
    const possibleTaskId = request.params?.id;
    if (possibleTaskId) {
      const task = await this.taskRepo.findOne({
        where: { id: possibleTaskId },
        withDeleted: true,
      });

      if (task) {
        // Attach task so controllers don't need a second DB hit
        request.resolvedTask = task;
        return task.departmentId;
      }
    }

    return null;
  }
}
