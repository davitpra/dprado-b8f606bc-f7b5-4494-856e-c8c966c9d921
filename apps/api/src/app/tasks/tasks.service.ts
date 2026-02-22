import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '@task-management/data';
import {
  CreateTaskDto,
  UpdateTaskDto,
  ReorderTaskDto,
  TaskFilterDto,
  PaginatedResponseDto,
} from '@task-management/data/dto';

import { Task } from '../entities/task.entity';
import { Department } from '../entities/department.entity';
import { User } from '../entities/user.entity';
import { AccessControlService } from '../access-control/access-control.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    private readonly acl: AccessControlService,
  ) {}

  async create(user: User, dto: CreateTaskDto): Promise<Task> {
    const dept = await this.deptRepo.findOne({
      where: { id: dto.departmentId },
    });
    if (!dept || dept.organizationId !== user.organizationId) {
      throw new NotFoundException('Department not found');
    }

    const canCreate = await this.acl.canCreateTaskInDepartment(
      user,
      dto.departmentId,
    );
    if (!canCreate) {
      throw new ForbiddenException(
        'You do not have permission to create tasks in this department',
      );
    }

    // Calculate next position for the given dept + status
    const status = dto.status ?? 'TODO';
    const { maxPos } = await this.taskRepo
      .createQueryBuilder('task')
      .select('COALESCE(MAX(task.position), -1)', 'maxPos')
      .where('task.departmentId = :deptId', { deptId: dto.departmentId })
      .andWhere('task.status = :status', { status })
      .andWhere('task.deletedAt IS NULL')
      .getRawOne();

    const task = this.taskRepo.create({
      ...dto,
      createdById: user.id,
      position: Number(maxPos) + 1,
    });

    const saved = await this.taskRepo.save(task);

    return this.taskRepo.findOne({
      where: { id: saved.id },
      relations: ['createdBy', 'assignedTo'],
    }) as Promise<Task>;
  }

  async findAll(
    user: User,
    filters: TaskFilterDto,
  ): Promise<PaginatedResponseDto<Task>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const sortBy = filters.sortBy ?? 'createdAt';
    const sortOrder = filters.sortOrder ?? 'desc';

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.assignedTo', 'assignedTo');

    if (this.acl.isOwner(user)) {
      // Owner: all tasks in their organization's departments
      const deptIds = await this.deptRepo
        .createQueryBuilder('dept')
        .select('dept.id')
        .where('dept.organizationId = :orgId', {
          orgId: user.organizationId,
        })
        .getMany();

      const ids = deptIds.map((d) => d.id);
      if (ids.length === 0) {
        return new PaginatedResponseDto<Task>([], 0, page, limit);
      }
      qb.andWhere('task.departmentId IN (:...deptIds)', { deptIds: ids });
    } else {
      // Non-owner: scope by user's department roles
      const userDepts = await this.acl.getUserDepartments(user.id);
      if (userDepts.length === 0) {
        return new PaginatedResponseDto<Task>([], 0, page, limit);
      }

      // If a specific department filter is provided, verify user has access
      if (filters.departmentId) {
        const hasAccess = userDepts.some(
          (d) => d.id === filters.departmentId,
        );
        if (!hasAccess) {
          throw new ForbiddenException(
            'You do not have access to this department',
          );
        }
      }

      // Separate admin vs viewer departments
      const userRoles = await Promise.all(
        userDepts.map(async (d) => ({
          departmentId: d.id,
          role: await this.acl.getUserRoleForDepartment(
            user.id,
            d.id,
            user,
          ),
        })),
      );

      const adminDeptIds = userRoles
        .filter((r) => r.role === UserRole.ADMIN)
        .map((r) => r.departmentId);
      const viewerDeptIds = userRoles
        .filter((r) => r.role === UserRole.VIEWER)
        .map((r) => r.departmentId);

      // Build scoped visibility conditions
      const conditions: string[] = [];
      const params: Record<string, unknown> = { userId: user.id };

      if (adminDeptIds.length > 0) {
        conditions.push('task.departmentId IN (:...adminDeptIds)');
        params['adminDeptIds'] = adminDeptIds;
      }
      if (viewerDeptIds.length > 0) {
        conditions.push(
          '(task.departmentId IN (:...viewerDeptIds) AND (task.createdById = :userId OR task.assignedToId = :userId))',
        );
        params['viewerDeptIds'] = viewerDeptIds;
      }

      if (conditions.length === 0) {
        return new PaginatedResponseDto<Task>([], 0, page, limit);
      }

      qb.andWhere(`(${conditions.join(' OR ')})`, params);
    }

    // Apply optional filters
    if (filters.departmentId) {
      qb.andWhere('task.departmentId = :filterDeptId', {
        filterDeptId: filters.departmentId,
      });
    }
    if (filters.status) {
      qb.andWhere('task.status = :status', { status: filters.status });
    }
    if (filters.category) {
      qb.andWhere('task.category = :category', {
        category: filters.category,
      });
    }
    if (filters.priority) {
      qb.andWhere('task.priority = :priority', {
        priority: filters.priority,
      });
    }
    if (filters.search) {
      qb.andWhere('LOWER(task.title) LIKE :search', {
        search: `%${filters.search.toLowerCase()}%`,
      });
    }

    // Sorting and pagination
    qb.orderBy(`task.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [items, total] = await qb.getManyAndCount();
    return new PaginatedResponseDto<Task>(items, total, page, limit);
  }

  async findOne(user: User, id: string): Promise<Task> {
    const task = await this.findTaskOrFail(id);

    const canAccess = await this.acl.canAccessTask(user, task);
    if (!canAccess) {
      throw new ForbiddenException(
        'You do not have permission to access this task',
      );
    }

    return task;
  }

  async update(user: User, id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findTaskOrFail(id);

    const canModify = await this.acl.canModifyTask(user, task);
    if (!canModify) {
      throw new ForbiddenException(
        'You do not have permission to modify this task',
      );
    }

    Object.assign(task, dto);
    // Clear the preloaded relation so TypeORM uses the updated FK column
    // instead of overwriting assignedToId with the stale relation object.
    if ('assignedToId' in dto) {
      task.assignedTo = null;
    }
    await this.taskRepo.save(task);

    return this.taskRepo.findOne({
      where: { id: task.id },
      relations: ['createdBy', 'assignedTo'],
    }) as Promise<Task>;
  }

  async reorder(
    user: User,
    id: string,
    dto: ReorderTaskDto,
  ): Promise<Task> {
    const task = await this.findTaskOrFail(id);

    const canModify = await this.acl.canModifyTask(user, task);
    if (!canModify) {
      throw new ForbiddenException(
        'You do not have permission to reorder this task',
      );
    }

    // Viewers cannot reorder — only Owner/Admin
    if (!this.acl.isOwner(user)) {
      const role = await this.acl.getUserRoleForDepartment(
        user.id,
        task.departmentId,
        user,
      );
      if (role !== UserRole.ADMIN) {
        throw new ForbiddenException('Only owners and admins can reorder tasks');
      }
    }

    task.status = dto.status;
    task.position = dto.position;
    await this.taskRepo.save(task);

    return this.taskRepo.findOne({
      where: { id: task.id },
      relations: ['createdBy', 'assignedTo'],
    }) as Promise<Task>;
  }

  async remove(user: User, id: string): Promise<void> {
    const task = await this.findTaskOrFail(id);

    const canModify = await this.acl.canModifyTask(user, task);
    if (!canModify) {
      throw new ForbiddenException(
        'You do not have permission to delete this task',
      );
    }

    await this.taskRepo.softRemove(task);
  }

  private async findTaskOrFail(id: string): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['createdBy', 'assignedTo'],
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }
}
