import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskCategory, TaskPriority, TaskStatus } from '../../enums/index.js';

export class TaskFilterDto {
  @ApiPropertyOptional({ description: 'Filter by department UUID' })
  @IsOptional()
  @IsUUID('4', { message: 'departmentId must be a valid UUID' })
  departmentId?: string;

  @ApiPropertyOptional({ enum: TaskStatus, description: 'Filter by task status' })
  @IsOptional()
  @IsEnum(TaskStatus, { message: `status must be one of: ${Object.values(TaskStatus).join(', ')}` })
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskCategory, description: 'Filter by task category' })
  @IsOptional()
  @IsEnum(TaskCategory, {
    message: `category must be one of: ${Object.values(TaskCategory).join(', ')}`,
  })
  category?: TaskCategory;

  @ApiPropertyOptional({ enum: TaskPriority, description: 'Filter by task priority' })
  @IsOptional()
  @IsEnum(TaskPriority, {
    message: `priority must be one of: ${Object.values(TaskPriority).join(', ')}`,
  })
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: 'login', description: 'Free-text search (max 200 chars)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: ['title', 'dueDate', 'priority', 'createdAt'], description: 'Sort field' })
  @IsOptional()
  @IsEnum(['title', 'dueDate', 'priority', 'createdAt'], {
    message: 'sortBy must be one of: title, dueDate, priority, createdAt',
  })
  sortBy?: 'title' | 'dueDate' | 'priority' | 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], description: 'Sort direction' })
  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'sortOrder must be asc or desc' })
  sortOrder?: 'asc' | 'desc';

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
