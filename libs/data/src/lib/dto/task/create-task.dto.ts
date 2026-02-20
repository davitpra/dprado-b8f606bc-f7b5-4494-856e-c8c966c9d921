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

export class CreateTaskDto {
  @IsString()
  @MinLength(1, { message: 'Title is required' })
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus, { message: `status must be one of: ${Object.values(TaskStatus).join(', ')}` })
  status?: TaskStatus;

  @IsEnum(TaskCategory, {
    message: `category must be one of: ${Object.values(TaskCategory).join(', ')}`,
  })
  category!: TaskCategory;

  @IsEnum(TaskPriority, {
    message: `priority must be one of: ${Object.values(TaskPriority).join(', ')}`,
  })
  priority!: TaskPriority;

  @IsOptional()
  @IsDateString({}, { message: 'dueDate must be a valid ISO 8601 date string' })
  dueDate?: string;

  @IsUUID('4', { message: 'departmentId must be a valid UUID' })
  departmentId!: string;

  @IsOptional()
  @IsUUID('4', { message: 'assignedToId must be a valid UUID' })
  assignedToId?: string;
}
