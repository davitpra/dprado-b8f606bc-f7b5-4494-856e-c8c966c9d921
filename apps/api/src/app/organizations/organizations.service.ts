import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
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
}
