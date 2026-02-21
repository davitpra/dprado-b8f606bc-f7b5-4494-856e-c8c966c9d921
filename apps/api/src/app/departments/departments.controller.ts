import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@task-management/auth';
import { CreateDepartmentDto, UpdateDepartmentDto } from '@task-management/data/dto';

import { User } from '../entities/user.entity';
import { DepartmentsService } from './departments.service';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly deptsService: DepartmentsService) {}

  /** POST /api/departments — Owner only. */
  @Post()
  @ApiOperation({ summary: 'Create a new department (Owner only)' })
  @ApiResponse({ status: 201, description: 'Department created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — Owner only' })
  create(@CurrentUser() user: User, @Body() dto: CreateDepartmentDto) {
    return this.deptsService.create(user, dto);
  }

  /** GET /api/departments — scoped by user role. */
  @Get()
  @ApiOperation({ summary: 'List departments scoped by user role' })
  @ApiResponse({ status: 200, description: 'Departments returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: User) {
    return this.deptsService.findAll(user);
  }

  /** PUT /api/departments/:id — Owner only. */
  @Put(':id')
  @ApiOperation({ summary: 'Update a department (Owner only)' })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiResponse({ status: 200, description: 'Department updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — Owner only' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.deptsService.update(user, id, dto);
  }

  /** DELETE /api/departments/:id — Owner only. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a department (Owner only)' })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiResponse({ status: 204, description: 'Department deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — Owner only' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.deptsService.remove(user, id);
  }
}
