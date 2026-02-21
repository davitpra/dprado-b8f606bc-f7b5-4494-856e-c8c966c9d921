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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@task-management/auth';
import {
  CreateTaskDto,
  UpdateTaskDto,
  ReorderTaskDto,
  TaskFilterDto,
} from '@task-management/data';

import { User } from '../entities/user.entity';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /** POST /api/tasks — create a new task. */
  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — Owner or Admin only' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  create(@CurrentUser() user: User, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user, dto);
  }

  /** GET /api/tasks — list tasks with filtering + pagination. */
  @Get()
  @ApiOperation({ summary: 'List tasks with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of tasks' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — no access to department' })
  findAll(@CurrentUser() user: User, @Query() filters: TaskFilterDto) {
    return this.tasksService.findAll(user, filters);
  }

  /** GET /api/tasks/:id — get a single task. */
  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — no access to this task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.tasksService.findOne(user, id);
  }

  /** PUT /api/tasks/:id — update a task. */
  @Put(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — no permission to modify' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user, id, dto);
  }

  /** PATCH /api/tasks/:id/reorder — reorder/move a task. */
  @Patch(':id/reorder')
  @ApiOperation({ summary: 'Reorder a task (change status column and/or position)' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task reordered successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — Owner or Admin only' })
  @ApiResponse({ status: 404, description: 'Task not found' })
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
  @ApiOperation({ summary: 'Soft-delete a task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — no permission to delete' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.tasksService.remove(user, id);
  }
}
