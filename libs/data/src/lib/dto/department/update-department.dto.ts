import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'Engineering', description: 'Department name (1–100 chars)' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Department name cannot be empty' })
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description', description: 'Department description (max 500 chars)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
