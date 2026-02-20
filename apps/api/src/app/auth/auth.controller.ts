import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@task-management/auth';

import {
  IAuthResponse,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
} from '@task-management/data';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user and organization' })
  register(@Body() dto: RegisterDto): Promise<IAuthResponse> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Authenticate and receive JWT tokens' })
  login(@Body() dto: LoginDto): Promise<IAuthResponse> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  refresh(@Body() dto: RefreshTokenDto): Promise<IAuthResponse> {
    return this.authService.refreshToken(dto.refresh_token);
  }
}
