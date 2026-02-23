import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@task-management/data';

import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { Organization } from '../entities/organization.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import type { RegisterDto, LoginDto } from '@task-management/data/dto';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  const u: Record<string, unknown> = {
    id: 'user-id',
    email: 'user@test.com',
    password: 'hashed-pw',
    firstName: 'Alice',
    lastName: 'Owner',
    organizationId: 'org-id',
    roles: [{ role: UserRole.OWNER, departmentId: null }],
    ...overrides,
  };
  Object.defineProperty(u, 'isOwner', {
    get: () => (u.roles as Array<{ role: UserRole }>).some((r) => r.role === UserRole.OWNER),
  });
  return u as unknown as User;
}

function makeLoginQb(user: User | null) {
  return {
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(user),
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('AuthService (unit)', () => {
  let service: AuthService;
  let userRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let orgRepo: { create: jest.Mock; save: jest.Mock };
  let userRoleRepo: { create: jest.Mock; save: jest.Mock };
  let jwtService: jest.Mocked<Pick<JwtService, 'sign' | 'verify'>>;
  let config: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      create: jest.fn((d) => ({ ...d })),
      save: jest.fn((e) => Promise.resolve({ id: 'saved-id', ...e })),
      createQueryBuilder: jest.fn(),
    };
    orgRepo = {
      create: jest.fn((d) => ({ ...d })),
      // Mutate the entity (like TypeORM does) so org.id is available after save
      save: jest.fn((e) => { e.id = 'org-id'; return Promise.resolve(e); }),
    };
    userRoleRepo = {
      create: jest.fn((d) => ({ ...d })),
      save: jest.fn((e) => Promise.resolve({ id: 'role-id', ...e })),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
      verify: jest.fn(),
    };
    config = {
      get: jest.fn().mockImplementation((key: string, fallback?: string) => {
        const map: Record<string, string> = {
          JWT_SECRET: 'test-secret',
          JWT_EXPIRATION: '15m',
          JWT_REFRESH_EXPIRATION: '7d',
        };
        return map[key] ?? fallback;
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Organization), useValue: orgRepo },
        { provide: getRepositoryToken(UserRoleEntity), useValue: userRoleRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── register() ────────────────────────────────────────────────────────────

  describe('register()', () => {
    const dto: RegisterDto = {
      email: 'new@test.com',
      password: 'Password123!',
      firstName: 'Alice',
      lastName: 'Smith',
    };

    it('throws ConflictException when email already exists', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('creates an organization for the new user', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await service.register(dto);
      expect(orgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Alice's Organization" }),
      );
      expect(orgRepo.save).toHaveBeenCalled();
    });

    it('uses organizationName from dto when provided', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await service.register({ ...dto, organizationName: 'Acme Corp' });
      expect(orgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Acme Corp' }),
      );
    });

    it('creates the user linked to the new organization', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await service.register(dto);
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: dto.email, organizationId: 'org-id' }),
      );
    });

    it('creates OWNER role with departmentId=null', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await service.register(dto);
      expect(userRoleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.OWNER, departmentId: null }),
      );
    });

    it('returns access_token and refresh_token', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const result = await service.register(dto);
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });
  });

  // ── login() ───────────────────────────────────────────────────────────────

  describe('login()', () => {
    const dto: LoginDto = { email: 'user@test.com', password: 'Password123!' };

    it('throws UnauthorizedException when user is not found', async () => {
      userRepo.createQueryBuilder.mockReturnValue(makeLoginQb(null));
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password does not match', async () => {
      userRepo.createQueryBuilder.mockReturnValue(makeLoginQb(makeUser()));
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens on valid credentials', async () => {
      userRepo.createQueryBuilder.mockReturnValue(makeLoginQb(makeUser()));
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      const result = await service.login(dto);
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('queries user with password field selected', async () => {
      const qb = makeLoginQb(null);
      userRepo.createQueryBuilder.mockReturnValue(qb);
      await service.login(dto).catch(() => {});
      expect(qb.addSelect).toHaveBeenCalledWith('user.password');
    });

    it('queries user with roles relation', async () => {
      const qb = makeLoginQb(null);
      userRepo.createQueryBuilder.mockReturnValue(qb);
      await service.login(dto).catch(() => {});
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('user.roles', 'roles');
    });
  });

  // ── refreshToken() ────────────────────────────────────────────────────────

  describe('refreshToken()', () => {
    it('throws UnauthorizedException when token type is not "refresh"', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-id', type: 'access' });
      await expect(service.refreshToken('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is not found', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-id', type: 'refresh' });
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.refreshToken('token')).rejects.toThrow(UnauthorizedException);
    });

    it('returns new tokens for valid refresh token', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-id', type: 'refresh' });
      userRepo.findOne.mockResolvedValue(makeUser());
      const result = await service.refreshToken('valid-refresh');
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });
  });

  // ── validateToken() ───────────────────────────────────────────────────────

  describe('validateToken()', () => {
    it('throws UnauthorizedException on invalid/expired token', () => {
      jwtService.verify.mockImplementation(() => { throw new Error('invalid'); });
      expect(() => service.validateToken('bad')).toThrow(UnauthorizedException);
    });

    it('returns decoded payload on valid token', () => {
      const payload = { sub: 'user-id', type: 'access' };
      jwtService.verify.mockReturnValue(payload);
      expect(service.validateToken('good')).toEqual(payload);
    });

    it('passes JWT_SECRET from config to verify', () => {
      jwtService.verify.mockReturnValue({ sub: 'u' });
      service.validateToken('tok');
      expect(jwtService.verify).toHaveBeenCalledWith('tok', { secret: 'test-secret' });
    });
  });
});
