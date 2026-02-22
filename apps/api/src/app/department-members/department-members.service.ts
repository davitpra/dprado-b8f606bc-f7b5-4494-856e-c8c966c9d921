import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '@task-management/data';
import { InviteMemberDto, UpdateMemberDto } from '@task-management/data/dto';

import { User } from '../entities/user.entity';
import { Department } from '../entities/department.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { AccessControlService } from '../access-control/access-control.service';

@Injectable()
export class DepartmentMembersService {
  constructor(
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly acl: AccessControlService,
  ) {}

  /** Invite a user to a department with a specific role. */
  async invite(
    user: User,
    departmentId: string,
    dto: InviteMemberDto,
  ): Promise<UserRoleEntity> {
    const dept = await this.findDepartmentInOrg(user, departmentId);

    const canManage = await this.acl.canManageDepartmentMembers(
      user,
      dept.id,
      dto.role,
    );
    if (!canManage) {
      throw new ForbiddenException(
        'You do not have permission to invite members with this role',
      );
    }

    const targetUser = await this.userRepo.findOne({
      where: { id: dto.userId },
      relations: ['roles'],
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }
    if (targetUser.organizationId !== user.organizationId) {
      throw new ForbiddenException('User does not belong to your organization');
    }
    if (targetUser.isOwner) {
      throw new ForbiddenException(
        'Cannot assign a department role to the organization owner',
      );
    }

    const existing = await this.userRoleRepo.findOne({
      where: { userId: dto.userId, departmentId },
    });
    if (existing) {
      throw new ConflictException(
        'User already has a role in this department',
      );
    }

    const role = this.userRoleRepo.create({
      userId: dto.userId,
      departmentId,
      role: dto.role,
    });
    const saved = await this.userRoleRepo.save(role);

    return this.userRoleRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['user'],
    });
  }

  /** List all members of a department. Owner or Admin only. */
  async findAll(user: User, departmentId: string): Promise<UserRoleEntity[]> {
    const dept = await this.findDepartmentInOrg(user, departmentId);

    if (!this.acl.isOwner(user)) {
      const role = await this.acl.getUserRoleForDepartment(
        user.id,
        dept.id,
        user,
      );
      if (!role) {
        throw new ForbiddenException(
          'Only department members can list members',
        );
      }
    }

    return this.userRoleRepo.find({
      where: { departmentId },
      relations: ['user'],
    });
  }

  /** Remove a member from a department. */
  async remove(
    user: User,
    departmentId: string,
    targetUserId: string,
  ): Promise<void> {
    const dept = await this.findDepartmentInOrg(user, departmentId);

    const targetRole = await this.userRoleRepo.findOne({
      where: { userId: targetUserId, departmentId: dept.id },
    });
    if (!targetRole) {
      throw new NotFoundException('Member not found in this department');
    }

    if (!this.acl.isOwner(user)) {
      const userRole = await this.acl.getUserRoleForDepartment(
        user.id,
        dept.id,
        user,
      );
      if (userRole !== UserRole.ADMIN) {
        throw new ForbiddenException(
          'You do not have permission to remove members',
        );
      }
      // Admin can only remove Viewers
      if (targetRole.role !== UserRole.VIEWER) {
        throw new ForbiddenException(
          'Admins can only remove viewers from the department',
        );
      }
    }

    await this.userRoleRepo.remove(targetRole);
  }

  /** Update a member's role within a department. Owner-only. */
  async updateRole(
    user: User,
    departmentId: string,
    targetUserId: string,
    dto: UpdateMemberDto,
  ): Promise<UserRoleEntity> {
    await this.findDepartmentInOrg(user, departmentId);

    if (!this.acl.isOwner(user)) {
      throw new ForbiddenException('Only the organization owner can change member roles');
    }

    const targetRole = await this.userRoleRepo.findOne({
      where: { userId: targetUserId, departmentId },
    });
    if (!targetRole) {
      throw new NotFoundException('Member not found in this department');
    }

    targetRole.role = dto.role;
    const saved = await this.userRoleRepo.save(targetRole);

    return this.userRoleRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['user'],
    });
  }

  /** Loads a department and verifies it belongs to the user's organization. */
  private async findDepartmentInOrg(
    user: User,
    departmentId: string,
  ): Promise<Department> {
    const dept = await this.deptRepo.findOne({
      where: { id: departmentId },
    });

    if (!dept) {
      throw new NotFoundException('Department not found');
    }

    if (dept.organizationId !== user.organizationId) {
      throw new ForbiddenException(
        'Department does not belong to your organization',
      );
    }

    return dept;
  }
}
