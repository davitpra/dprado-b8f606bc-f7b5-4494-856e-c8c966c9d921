import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '@task-management/data';

import { User } from '../entities/user.entity';
import { Task } from '../entities/task.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { Department } from '../entities/department.entity';
import { Permission } from '../entities/permission.entity';

@Injectable()
export class AccessControlService {
  constructor(
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  /** Owner bypasses all RBAC checks. */
  isOwner(user: User): boolean {
    return user.isOwner;
  }

  /**
   * Resolve the user's role for a specific department.
   * Uses the in-memory `user.roles` relation when available,
   * otherwise falls back to a DB query.
   */
  async getUserRoleForDepartment(
    userId: string,
    departmentId: string,
    user?: User,
  ): Promise<UserRole | null> {
    // Fast path: roles already loaded on the user object
    if (user?.roles) {
      const match = user.roles.find(
        (r) => r.departmentId === departmentId,
      );
      return match?.role ?? null;
    }

    // Fallback: DB query
    const role = await this.userRoleRepo.findOne({
      where: { userId, departmentId },
    });
    return role?.role ?? null;
  }

  /** Returns all departments where the user has at least one dept-scoped role (excludes OWNER). */
  async getUserDepartments(userId: string): Promise<Department[]> {
    const roles = await this.userRoleRepo.find({
      where: { userId },
      relations: ['department'],
    });
    return roles
      .filter((r) => r.departmentId !== null)
      .map((r) => r.department!);
  }

  /** Can the user read this task? */
  async canAccessTask(user: User, task: Task): Promise<boolean> {
    if (this.isOwner(user)) return true;

    const role = await this.getUserRoleForDepartment(
      user.id,
      task.departmentId,
      user,
    );
    if (!role) return false;

    if (role === UserRole.ADMIN) return true;

    // Viewer: only own tasks (created or assigned)
    return (
      task.createdById === user.id || task.assignedToId === user.id
    );
  }

  /** Can the user edit or soft-delete this task? */
  async canModifyTask(user: User, task: Task): Promise<boolean> {
    if (this.isOwner(user)) return true;

    const role = await this.getUserRoleForDepartment(
      user.id,
      task.departmentId,
      user,
    );
    if (!role) return false;

    if (role === UserRole.ADMIN) return true;

    // Viewer: only own tasks
    return (
      task.createdById === user.id || task.assignedToId === user.id
    );
  }

  /** Can the user create tasks in this department? Owner or Admin only. */
  async canCreateTaskInDepartment(
    user: User,
    departmentId: string,
  ): Promise<boolean> {
    if (this.isOwner(user)) return true;

    const role = await this.getUserRoleForDepartment(
      user.id,
      departmentId,
      user,
    );
    return role === UserRole.ADMIN;
  }

  /**
   * Can the user manage (invite/remove) members in this department?
   * - Inviting as Admin → Owner only
   * - Inviting as Viewer → Owner or Admin of the department
   */
  async canManageDepartmentMembers(
    user: User,
    departmentId: string,
    targetRole: UserRole.ADMIN | UserRole.VIEWER,
  ): Promise<boolean> {
    if (this.isOwner(user)) return true;

    if (targetRole === UserRole.ADMIN) {
      // Only Owner can invite admins
      return false;
    }

    // targetRole === VIEWER → Owner or Admin of the department
    const role = await this.getUserRoleForDepartment(
      user.id,
      departmentId,
      user,
    );
    return role === UserRole.ADMIN;
  }

  /**
   * Check if the user's role in the given department grants a specific
   * action+resource permission (from the permissions table).
   * Owner always bypasses.
   */
  async hasPermission(
    user: User,
    departmentId: string,
    action: string,
    resource: string,
  ): Promise<boolean> {
    if (this.isOwner(user)) return true;

    const role = await this.getUserRoleForDepartment(
      user.id,
      departmentId,
      user,
    );
    if (!role) return false;

    const count = await this.permissionRepo.count({
      where: { action: action as Permission['action'], resource: resource as Permission['resource'], role: role as Permission['role'] },
    });
    return count > 0;
  }
}
