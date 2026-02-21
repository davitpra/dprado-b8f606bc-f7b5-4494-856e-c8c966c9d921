import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus } from '../../enums/index.js';

export class ReorderTaskDto {
  @ApiProperty({ example: 0, description: 'New position index (0-based)' })
  @Type(() => Number)
  @IsInt({ message: 'position must be an integer' })
  @Min(0, { message: 'position must be 0 or greater' })
  position!: number;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.IN_PROGRESS, description: 'Target status column' })
  @IsEnum(TaskStatus, { message: `status must be one of: ${Object.values(TaskStatus).join(', ')}` })
  status!: TaskStatus;
}
