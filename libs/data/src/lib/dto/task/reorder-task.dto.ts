import { IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus } from '../../enums/index.js';

export class ReorderTaskDto {
  @Type(() => Number)
  @IsInt({ message: 'position must be an integer' })
  @Min(0, { message: 'position must be 0 or greater' })
  position!: number;

  @IsEnum(TaskStatus, { message: `status must be one of: ${Object.values(TaskStatus).join(', ')}` })
  status!: TaskStatus;
}
