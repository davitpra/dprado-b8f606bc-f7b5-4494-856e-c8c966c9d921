import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Engineering', description: 'Department name (1–100 chars)' })
  @IsString()
  @MinLength(1, { message: 'Department name is required' })
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Software engineering team', description: 'Department description (max 500 chars)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
