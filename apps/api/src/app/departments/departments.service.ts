import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDepartmentDto, UpdateDepartmentDto } from '@task-management/data';

import { Department } from '../entities/department.entity';
import { User } from '../entities/user.entity';
import { AccessControlService } from '../access-control/access-control.service';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    private readonly acl: AccessControlService,
  ) {}

  /** Create a department. Owner only. */
  async create(user: User, dto: CreateDepartmentDto): Promise<Department> {
    this.requireOwner(user);

    return this.deptRepo.save(
      this.deptRepo.create({
        name: dto.name,
        description: dto.description ?? null,
        organizationId: user.organizationId,
      }),
    );
  }

  /**
   * List departments accessible to the user.
   * Owner → all org departments.
   * Admin/Viewer → only departments where they hold a UserRole.
   */
  async findAll(user: User): Promise<Department[]> {
    if (this.acl.isOwner(user)) {
      return this.deptRepo.find({
        where: { organizationId: user.organizationId },
        order: { name: 'ASC' },
      });
    }

    return this.acl.getUserDepartments(user.id);
  }

  /** Update a department. Owner only. */
  async update(
    user: User,
    deptId: string,
    dto: UpdateDepartmentDto,
  ): Promise<Department> {
    this.requireOwner(user);

    const dept = await this.findOwnedDepartment(user, deptId);

    Object.assign(dept, dto);
    return this.deptRepo.save(dept);
  }

  /** Delete a department. Owner only. */
  async remove(user: User, deptId: string): Promise<void> {
    this.requireOwner(user);

    const dept = await this.findOwnedDepartment(user, deptId);
    await this.deptRepo.remove(dept);
  }

  /** Throws ForbiddenException if the user is not the org Owner. */
  private requireOwner(user: User): void {
    if (!this.acl.isOwner(user)) {
      throw new ForbiddenException('Only the organization owner can manage departments');
    }
  }

  /** Loads a department and verifies it belongs to the user's organization. */
  private async findOwnedDepartment(
    user: User,
    deptId: string,
  ): Promise<Department> {
    const dept = await this.deptRepo.findOne({ where: { id: deptId } });

    if (!dept) {
      throw new NotFoundException('Department not found');
    }

    if (dept.organizationId !== user.organizationId) {
      throw new ForbiddenException('Department does not belong to your organization');
    }

    return dept;
  }
}
