import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { TaskStatus, TaskCategory, TaskPriority } from '../../enums/index.js';

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Updated title', description: 'Task title (1–200 chars)' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Title cannot be empty' })
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description', description: 'Task description (max 2000 chars)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, description: 'Task status' })
  @IsOptional()
  @IsEnum(TaskStatus, { message: `status must be one of: ${Object.values(TaskStatus).join(', ')}` })
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskCategory, description: 'Task category' })
  @IsOptional()
  @IsEnum(TaskCategory, {
    message: `category must be one of: ${Object.values(TaskCategory).join(', ')}`,
  })
  category?: TaskCategory;

  @ApiPropertyOptional({ enum: TaskPriority, description: 'Task priority' })
  @IsOptional()
  @IsEnum(TaskPriority, {
    message: `priority must be one of: ${Object.values(TaskPriority).join(', ')}`,
  })
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: '2026-03-15T00:00:00.000Z', description: 'Due date (ISO 8601)' })
  @IsOptional()
  @IsDateString({}, { message: 'dueDate must be a valid ISO 8601 date string' })
  dueDate?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Assigned user UUID' })
  @IsOptional()
  @IsUUID('4', { message: 'assignedToId must be a valid UUID' })
  assignedToId?: string;
}
