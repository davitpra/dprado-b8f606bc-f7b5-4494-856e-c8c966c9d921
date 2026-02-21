import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@task-management/auth';
import {
  CreateTaskDto,
  UpdateTaskDto,
  ReorderTaskDto,
  TaskFilterDto,
} from '@task-management/data';

import { User } from '../entities/user.entity';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /** POST /api/tasks — create a new task. */
  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user, dto);
  }

  /** GET /api/tasks — list tasks with filtering + pagination. */
  @Get()
  findAll(@CurrentUser() user: User, @Query() filters: TaskFilterDto) {
    return this.tasksService.findAll(user, filters);
  }

  /** GET /api/tasks/:id — get a single task. */
  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.tasksService.findOne(user, id);
  }

  /** PUT /api/tasks/:id — update a task. */
  @Put(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user, id, dto);
  }

  /** PATCH /api/tasks/:id/reorder — reorder/move a task. */
  @Patch(':id/reorder')
  reorder(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ReorderTaskDto,
  ) {
    return this.tasksService.reorder(user, id, dto);
  }

  /** DELETE /api/tasks/:id — soft-delete a task. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.tasksService.remove(user, id);
  }
}
