import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';

import { JwtStrategy } from './jwt.strategy';
import { User } from '../entities/user.entity';
import { UserRole } from '@task-management/data';

describe('JwtStrategy (unit)', () => {
  let strategy: JwtStrategy;
  let userRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    userRepo = { findOne: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: getRepositoryToken(User), useValue: userRepo },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-secret') },
        },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns the user when found in the database', async () => {
    const user = { id: 'u1', roles: [{ role: UserRole.OWNER }] } as unknown as User;
    userRepo.findOne.mockResolvedValue(user);
    const result = await strategy.validate({ sub: 'u1', email: 'a@b.com', isOwner: true });
    expect(result).toBe(user);
    expect(userRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'u1' },
      relations: ['roles'],
    });
  });

  it('throws UnauthorizedException when user is not found', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(
      strategy.validate({ sub: 'missing', email: 'x@y.com', isOwner: false }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
