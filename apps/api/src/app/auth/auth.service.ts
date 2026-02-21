import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';

import { IAuthResponse, LoginDto, RegisterDto, UserRole } from '@task-management/data';
import { User } from '../entities/user.entity';
import { Organization } from '../entities/organization.entity';
import { UserRoleEntity } from '../entities/user-role.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Register a new user — creates an organization and sets the user as owner. */
  async register(dto: RegisterDto): Promise<IAuthResponse> {
    const exists = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    // Create a default organization for the new user
    const org = this.orgRepo.create({
      name: `${dto.firstName}'s Organization`,
    });
    await this.orgRepo.save(org);

    // Create the user (owner role assigned via user_roles below)
    const user = this.userRepo.create({
      email: dto.email,
      password: dto.password, // hashed by @BeforeInsert hook
      firstName: dto.firstName,
      lastName: dto.lastName,
      organizationId: org.id,
    });
    await this.userRepo.save(user);

    // Assign OWNER role (org-wide, no department)
    const ownerRole = this.userRoleRepo.create({
      userId: user.id,
      role: UserRole.OWNER,
      departmentId: null,
    });
    await this.userRoleRepo.save(ownerRole);
    user.roles = [ownerRole];

    return this.generateTokens(user);
  }

  /** Validate credentials and return JWT tokens. */
  async login(dto: LoginDto): Promise<IAuthResponse> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.roles', 'roles')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  /** Issue a new access token (and refresh token) from a valid refresh token. */
  async refreshToken(token: string): Promise<IAuthResponse> {
    const payload = this.validateToken(token);

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub }, relations: ['roles'] });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens(user);
  }

  /** Verify a JWT and return its decoded payload. Throws on invalid/expired tokens. */
  validateToken(token: string): { sub: string; type?: string } {
    try {
      return this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /** Build access + refresh token pair for a given user. */
  private generateTokens(user: User): IAuthResponse {
    const accessPayload = {
      sub: user.id,
      email: user.email,
      isOwner: user.isOwner,
    };

    const refreshPayload = {
      sub: user.id,
      type: 'refresh',
    };

    return {
      access_token: this.jwtService.sign(accessPayload, {
        expiresIn: this.config.get<string>('JWT_EXPIRATION', '15m') as StringValue,
      }),
      refresh_token: this.jwtService.sign(refreshPayload, {
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRATION', '7d') as StringValue,
      }),
    };
  }
}
