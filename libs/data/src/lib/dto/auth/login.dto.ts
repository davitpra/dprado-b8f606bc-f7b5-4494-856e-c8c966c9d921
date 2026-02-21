import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner@acme.com', description: 'User email address' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  email!: string;

  @ApiProperty({ example: 'Password123!', description: 'User password (min 8 characters)' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  password!: string;
}
