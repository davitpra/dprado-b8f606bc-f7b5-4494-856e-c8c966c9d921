import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public } from '@task-management/auth';

import { IAuthMeResponse, IAuthResponse } from '@task-management/data';
import { LoginDto, RefreshTokenDto, RegisterDto } from '@task-management/data/dto';
import { User } from '../entities/user.entity';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user and organization' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  register(@Body() dto: RegisterDto): Promise<IAuthResponse> {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  @ApiOperation({ summary: 'Authenticate and receive JWT tokens' })
  @ApiResponse({ status: 201, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto): Promise<IAuthResponse> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @ApiResponse({ status: 201, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  refresh(@Body() dto: RefreshTokenDto): Promise<IAuthResponse> {
    return this.authService.refreshToken(dto.refresh_token);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile and roles' })
  @ApiResponse({ status: 200, description: 'Current user profile with roles' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  me(@CurrentUser() user: User): IAuthMeResponse {
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        isOwner: user.isOwner,
        createdAt: user.createdAt.toISOString(),
      },
      roles: user.roles.map((r) => ({
        id: r.id,
        userId: r.userId,
        role: r.role,
        departmentId: r.departmentId,
      })),
    };
  }
}
