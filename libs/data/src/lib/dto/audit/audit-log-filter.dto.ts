import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AuditLogFilterDto {
  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z', description: 'Filter from date (ISO 8601)' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z', description: 'Filter to date (ISO 8601)' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filter by acting user UUID' })
  @IsOptional()
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  userId?: string;

  @ApiPropertyOptional({ example: 'create', description: 'Filter by action (create, update, delete, access_denied)' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: 'task', description: 'Filter by resource type (task, department, member)' })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({ description: 'Filter by department UUID' })
  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @ApiPropertyOptional({ example: 1, description: 'Page number (min 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, description: 'Items per page (1–100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'limit cannot exceed 100' })
  limit?: number;
}
