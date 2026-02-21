import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'JWT refresh token' })
  @IsString()
  @IsNotEmpty({ message: 'refresh_token is required' })
  refresh_token!: string;
}
