import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../entities/user.entity';
import { Task } from '../entities/task.entity';
import { AccessControlService } from './access-control.service';

/**
 * Guard for task create / edit / delete operations.
 *
 * Behaviour:
 *  - **Create** (no `params.id`): Owner or Admin in the target department.
 *    Viewer is rejected.
 *  - **Modify** (`params.id` present): Owner/Admin can touch any task in
 *    their scope. Viewer can only modify tasks they created
 *    (`task.createdById === user.id`).
 *
 * The loaded task is attached to `request.resolvedTask` so downstream
 * controllers can skip a redundant DB lookup.
 */
@Injectable()
export class TaskOwnershipGuard implements CanActivate {
  constructor(
    private readonly acl: AccessControlService,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: User | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Owner bypasses everything
    if (this.acl.isOwner(user)) {
      return true;
    }

    const taskId: string | undefined = request.params?.id;

    if (taskId) {
      return this.checkModify(request, user, taskId);
    }

    return this.checkCreate(request, user);
  }

  /** POST /tasks — only Owner or Admin may create. */
  private async checkCreate(
    request: { body?: { departmentId?: string } },
    user: User,
  ): Promise<boolean> {
    const departmentId = request.body?.departmentId;

    if (!departmentId) {
      throw new ForbiddenException(
        'departmentId is required to create a task',
      );
    }

    const allowed = await this.acl.canCreateTaskInDepartment(
      user,
      departmentId,
    );

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have permission to create tasks in this department',
      );
    }

    return true;
  }

  /** PUT / PATCH / DELETE /tasks/:id — ownership check for Viewers. */
  private async checkModify(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request: Record<string, any>,
    user: User,
    taskId: string,
  ): Promise<boolean> {
    // Reuse task if already loaded by PermissionsGuard
    const task: Task | null =
      request.resolvedTask ??
      (await this.taskRepo.findOne({
        where: { id: taskId },
        withDeleted: true,
      }));

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Attach for downstream reuse
    request.resolvedTask = task;

    const allowed = await this.acl.canModifyTask(user, task);

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have permission to modify this task',
      );
    }

    return true;
  }
}
