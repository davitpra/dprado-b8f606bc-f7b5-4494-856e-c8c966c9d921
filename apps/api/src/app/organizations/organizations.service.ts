import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateOrgUserDto } from '@task-management/data/dto';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getByUser(organizationId: string): Promise<Organization> {
    const org = await this.orgRepo.findOne({
      where: { id: organizationId },
      relations: ['departments'],
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async getUsersForOrg(organizationId: string): Promise<User[]> {
    const org = await this.orgRepo.findOne({
      where: { id: organizationId },
      relations: ['users', 'users.roles'],
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org.users;
  }

  async createUser(owner: User, dto: CreateOrgUserDto): Promise<User> {
    if (!owner.isOwner) {
      throw new ForbiddenException('Only the organization owner can create users');
    }

    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const user = this.userRepo.create({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      organizationId: owner.organizationId,
    });

    return this.userRepo.save(user);
  }
}
